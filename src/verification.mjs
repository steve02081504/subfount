// Compatibility bridge until the fount-p2p verification entry point is published.
import { randomBytes } from 'node:crypto'

import { isHex64 } from 'npm:@steve02081504/fount-p2p/core/hexIds'
import { getNodeHash } from 'npm:@steve02081504/fount-p2p/node/identity'
import { sendToNodeLink } from 'npm:@steve02081504/fount-p2p/transport/link_registry'
import { attachNodeScopeFeature } from 'npm:@steve02081504/fount-p2p/transport/node_scope/features'

const MAX_TIMEOUT = 30 * 60 * 1000

/**
 * 创建有界的挑战服务（挑战过期即失效）；发送方身份来自已认证的网络入口。
 * @param {object} options 依赖
 * @param {string} options.nodeHash 本节点哈希
 * @param {(peer: string, action: string, payload: object) => Promise<boolean>} options.send 向指定节点发送网络动作
 * @param {() => number} [options.now=Date.now] 当前时间
 * @returns {object} 挑战服务
 */
export function createNetworkVerificationService({ nodeHash, send, now = Date.now }) {
	const requests = new Map()
	const proofs = new Map()
	/**
	 * 丢弃早已过期、不再可能被引用的挑战。
	 */
	function prune() {
		for (const [id, entry] of requests) if (entry.expiresAt + 60000 < now()) requests.delete(id)
	}
	/**
	 * 取挑战记录的快照，顺带把到期的 pending 标记为失败。
	 * @param {object} entry 挑战记录
	 * @returns {object} 快照
	 */
	function snapshot(entry) {
		if (entry.status === 'pending' && now() >= entry.expiresAt) {
			entry.status = 'failed'
			entry.reason = 'timeout'
		}
		return { ...entry }
	}
	return {
		/**
		 * 发起一次挑战，超时时间有上界。
		 * @param {object} [options] 选项
		 * @param {number} [options.timeoutMs=300000] 有效期毫秒
		 * @returns {object} 挑战快照
		 */
		create({ timeoutMs = 300000 } = {}) {
			if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT) throw new Error('invalid timeoutMs')
			prune()
			if (requests.size >= 1024) throw new Error('too many verification requests')
			const challenge = randomBytes(32).toString('hex')
			const entry = { challenge, requesterNodeHash: nodeHash, expiresAt: now() + timeoutMs, status: 'pending' }
			requests.set(challenge, entry)
			return snapshot(entry)
		},
		/**
		 * 查询挑战状态。
		 * @param {string} challenge 挑战串
		 * @returns {object|null} 挑战快照；不存在时为 null
		 */
		get(challenge) {
			prune()
			const entry = requests.get(challenge)
			return entry ? snapshot(entry) : null
		},
		/**
		 * 处理对端发来的 verification_claim / verification_receipt。
		 * @param {string} action 网络动作名
		 * @param {object} payload 动作负载
		 * @param {string} sender 已认证的发送方节点哈希
		 */
		async receive(action, payload, sender) {
			if (!isHex64(sender) || !isHex64(payload?.challenge)) return
			if (action === 'verification_claim') {
				const entry = requests.get(payload.challenge)
				if (!entry || now() >= entry.expiresAt || snapshot(entry).status === 'failed' || entry.expiresAt !== payload.expiresAt) return
				if (entry.status === 'verified' && entry.nodeHash !== sender) return
				entry.status = 'verified'
				entry.nodeHash = sender
				await send(sender, 'verification_receipt', { challenge: entry.challenge, expiresAt: entry.expiresAt })
			}
			if (action === 'verification_receipt') {
				const proof = proofs.get(payload.challenge)
				if (proof && proof.requesterNodeHash === sender && proof.expiresAt === payload.expiresAt && now() < proof.expiresAt)
					proof.resolve({ status: 'verified', nodeHash })
			}
		},
		/**
		 * 证明本节点能触达请求方并收到它的确认。
		 * @param {object} request 挑战参数
		 * @param {string} request.requesterNodeHash 请求方节点哈希
		 * @param {string} request.challenge 挑战串
		 * @param {number} request.expiresAt 挑战截止时间
		 * @returns {Promise<object>} 验证结果
		 */
		async prove({ requesterNodeHash, challenge, expiresAt }) {
			if (!isHex64(requesterNodeHash) || !isHex64(challenge) || !Number.isSafeInteger(expiresAt) || expiresAt <= now() || expiresAt > now() + MAX_TIMEOUT)
				return { status: 'failed', reason: 'invalid challenge' }
			if (proofs.has(challenge)) {
				const existing = proofs.get(challenge)
				if (existing.requesterNodeHash !== requesterNodeHash || existing.expiresAt !== expiresAt) return { status: 'failed', reason: 'challenge mismatch' }
				return existing.promise
			}
			if (proofs.size >= 64) return { status: 'failed', reason: 'busy' }
			let resolve
			const promise = new Promise(done => { resolve = done })
			proofs.set(challenge, { requesterNodeHash, expiresAt, resolve, promise })
			const timer = setTimeout(() => resolve({ status: 'failed', reason: 'timeout' }), Math.min(expiresAt - now(), 15000))
			try {
				void send(requesterNodeHash, 'verification_claim', { challenge, expiresAt }).then(sent => {
					if (!sent) resolve({ status: 'failed', reason: 'unreachable' })
				}).catch(() => resolve({ status: 'failed', reason: 'unreachable' }))
				return await promise
			}
			catch { return { status: 'failed', reason: 'unreachable' } }
			finally { clearTimeout(timer); proofs.delete(challenge) }
		},
	}
}

let service
/**
 * 给运行中的节点挂上验证相关的网络动作。
 * @returns {() => void} disposer
 */
export function attachNetworkVerification() {
	return attachNodeScopeFeature('verification', wire => {
		const current = getNetworkVerificationService()
		const disposers = ['verification_claim', 'verification_receipt'].map(action => wire.on(action, (payload, sender) => {
			void current.receive(action, payload, sender).catch(() => { })
		}))
		return () => { for (const dispose of disposers) dispose(); service = null }
	})
}

/**
 * 取当前节点的验证服务（首次调用时惰性创建）。
 * @returns {ReturnType<typeof createNetworkVerificationService>} service
 */
export function getNetworkVerificationService() {
	if (!service) service = createNetworkVerificationService({
		nodeHash: getNodeHash(),
		/**
		 * 经节点链路发送验证动作。
		 * @param {string} peer 目标节点哈希
		 * @param {string} action 网络动作名
		 * @param {object} payload 动作负载
		 * @returns {Promise<boolean>} 是否送达
		 */
		send: (peer, action, payload) => sendToNodeLink(peer, { scope: 'node', action, payload }),
	})
	return service
}

/**
 * 证明本节点能触达请求方并收到它的确认。
 * @param {{requesterNodeHash: string, challenge: string, expiresAt: number}} request challenge
 * @returns {Promise<object>} verification result
 */
export async function proveNetworkVerification(request) {
	const dispose = attachNetworkVerification()
	try { return await getNetworkVerificationService().prove(request) }
	finally { dispose() }
}
