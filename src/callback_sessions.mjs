/**
 * 创建长期回调会话运行时：生产者初始化与事件流分离，租约、取消与断线统一释放其资源。
 * @param {object} options 运行时依赖
 * @param {(peerId: string) => boolean} options.authorize 判断该 peer 是否为已认证主机
 * @param {(frame: object, peerId: string) => Promise<void>} options.send 发送一帧，失败时抛错
 * @param {(script: string, context: object) => Promise<*>} options.evaluate 执行主机脚本，长期循环由脚本自行启动
 * @param {number} [options.leaseMs] 租约时长（毫秒）
 * @param {number} [options.maxFrames] 单个会话未发出的最大帧数
 * @param {number} [options.maxBytes] 单帧与 ready 载荷的最大字节数
 * @param {number} [options.maxQueuedBytes] 单个会话未发出的最大字节数
 * @param {number} [options.maxSessions] 同时存活的最大会话数
 * @returns {object} 回调会话运行时（`handle` / `disconnect` / `dispose` / `size`）
 */
export function createCallbackSessionRuntime({ authorize, send, evaluate, leaseMs = 30000, maxFrames = 64, maxBytes = 262144, maxQueuedBytes = 1048576, maxSessions = 128 }) {
	const sessions = new Map()
	const tombstones = new Map()
	let disposed = false

	/**
	 * 复制载荷并量出它的 UTF-8 字节数（事件与 ready 共用同一条 JSON 通道）。
	 * @param {*} data 待发送载荷
	 * @returns {{ value: *, bytes: number }} JSON 副本与其字节数
	 */
	function clonePayload(data) {
		const encoded = JSON.stringify(data)
		const bytes = new TextEncoder().encode(encoded).length
		if (bytes > maxBytes) throw new Error(`payload over ${maxBytes} bytes`)
		return { value: JSON.parse(encoded), bytes }
	}

	/**
	 * 同步释放生产者资源；异步清理不阻塞断线。
	 * @param {object} entry 会话条目
	 * @param {*} reason 释放原因（作为 abort 信号）
	 */
	function release(entry, reason) {
		if (!entry.controller.signal.aborted) entry.controller.abort(reason)
		const cleanups = [...entry.cleanups]
		entry.cleanups.clear()
		for (const cleanup of cleanups)
			try { Promise.resolve(cleanup()).catch(() => { }) } catch { /* 单个清理失败不阻塞其它资源 */ }
	}

	/**
	 * 结束会话：同步释放资源、清空队列，并（可选）向主机发终帧。
	 * @param {object} entry 会话条目
	 * @param {string} reason 结束原因
	 * @param {boolean} [notify] 是否发送终帧（断线与停机时主机已不需要它）
	 */
	function finish(entry, reason, notify = true) {
		if (entry.closed) return
		entry.closed = true
		sessions.delete(entry.id)
		tombstones.set(entry.id, Date.now() + leaseMs * 2)
		if (tombstones.size > maxSessions * 2) tombstones.delete(tombstones.keys().next().value)
		clearTimeout(entry.timer)
		release(entry, reason)
		entry.queue.length = 0
		entry.queuedBytes = 0
		if (notify) void Promise.resolve().then(() => send({ id: entry.id, type: 'end', reason }, entry.peerId)).catch(() => { })
	}

	/**
	 * 延长租约；主机停止续期时由计时器收回会话。
	 * @param {object} entry 会话条目
	 */
	function renew(entry) {
		clearTimeout(entry.timer)
		entry.timer = setTimeout(() => finish(entry, 'lease-expired'), leaseMs)
	}

	/**
	 * 串行发送有界队列；发送失败即释放生产者。
	 * @param {object} entry 会话条目
	 */
	async function drain(entry) {
		if (entry.sending || !entry.ready || entry.closed) return
		entry.sending = true
		try {
			while (entry.queue.length && !entry.closed) {
				const { frame, bytes } = entry.queue.shift()
				entry.queuedBytes -= bytes
				await send(frame, entry.peerId)
			}
			if (entry.ending && !entry.closed) finish(entry, entry.ending)
		}
		catch { finish(entry, 'transport-error', false) }
		finally { entry.sending = false }
	}

	/**
	 * 入队一个事件帧；超出帧数或字节上限时按溢出结束会话。
	 * @param {object} entry 会话条目
	 * @param {*} data 事件载荷
	 * @returns {boolean} 是否已受理
	 */
	function enqueue(entry, data) {
		if (entry.closed || entry.ending) return false
		let frame, bytes
		try {
			const payload = clonePayload(data)
			frame = { id: entry.id, type: 'event', seq: ++entry.seq, data: payload.value }
			bytes = payload.bytes
		}
		catch (error) { finish(entry, error.message); return false }
		if (entry.queue.length >= maxFrames || entry.queuedBytes + bytes > maxQueuedBytes) { finish(entry, 'callback-overflow'); return false }
		entry.queuedBytes += bytes
		entry.queue.push({ frame, bytes })
		void drain(entry)
		return true
	}

	/**
	 * 处理主机的 open / renew / cancel；初始化不得等待生产者的长期循环。
	 * @param {object} message 主机消息
	 * @param {string} peerId 发送方 peer
	 */
	async function handle(message, peerId) {
		if (disposed || !authorize(peerId) || !/^[\w-]{1,80}$/.test(message?.id)) return
		const { id, op } = message
		const existing = sessions.get(id)
		if (existing && existing.peerId !== peerId) return
		if (op === 'cancel') {
			if (existing) finish(existing, 'cancelled')
			else {
				tombstones.set(id, Date.now() + leaseMs * 2)
				if (tombstones.size > maxSessions * 2) tombstones.delete(tombstones.keys().next().value)
			}
			return
		}
		if (op === 'renew') {
			if (!existing) { await send({ id, type: 'end', reason: 'session-missing' }, peerId); return }
			renew(existing)
			await send({ id, type: 'heartbeat' }, peerId)
			return
		}
		if (op !== 'open' || existing) return
		if ((tombstones.get(id) || 0) > Date.now()) { await send({ id, type: 'end', reason: 'cancelled' }, peerId); return }
		tombstones.delete(id)
		if (typeof message.script !== 'string' || message.script.length > maxBytes || sessions.size >= maxSessions) {
			await send({ id, type: 'end', reason: 'session-limit' }, peerId)
			return
		}
		const entry = { id, peerId, controller: new AbortController(), cleanups: new Set(), queue: [], queuedBytes: 0, seq: 0, ready: false, closed: false, sending: false, ending: null, timer: null }
		sessions.set(id, entry)
		renew(entry)
		const callbackSession = {
			signal: entry.controller.signal,
			emit: data => enqueue(entry, data),
			close: (reason = 'completed') => {
				if (entry.closed || entry.ending) return
				entry.ending = reason
				release(entry, reason)
				void drain(entry)
			},
			/**
			 * 登记资源清理函数；取消与初始化竞态时立即清理迟到资源。
			 * @param {Function} cleanup 清理函数，应快速释放资源
			 */
			onDispose: cleanup => {
				if (entry.closed || entry.ending) { try { Promise.resolve(cleanup()).catch(() => { }) } catch { /* ignore */ } }
				else entry.cleanups.add(cleanup)
			},
		}
		try {
			const result = await evaluate(message.script, { callbackSession })
			if (entry.closed) return
			// ready 先于初始化期间产生的事件；整个返回值必须能通过 JSON 通道。
			await send({ id, type: 'ready', result: clonePayload(result ?? null).value }, peerId)
			entry.ready = true
			void drain(entry)
		}
		catch (error) { finish(entry, `setup-error: ${error.message}`) }
	}

	return {
		handle,
		/**
		 * 断线即时释放该主机的全部会话。
		 * @param {string} peerId 断线的 peer
		 */
		disconnect(peerId) { for (const entry of sessions.values()) if (entry.peerId === peerId) finish(entry, 'disconnected', false) },
		/** 关闭运行时；不等待用户提供的无限循环或异步清理。 */
		dispose() { disposed = true; for (const entry of sessions.values()) finish(entry, 'shutdown', false) },
		get size() { return sessions.size },
	}
}
