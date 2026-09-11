import assert from 'node:assert/strict'
import process from 'node:process'

import { createRunCodeHandler, createShellExecHandler } from '../src/handlers.mjs'
import { killProcessTree } from '../src/process.mjs'

function makeActions() {
	const sent = []
	const spawned = []
	return {
		sent,
		spawned,
		sendResponse: (data, peerId) => sent.push({ data, peerId }),
		sendCallback: (data, peerId) => sent.push({ data, peerId }),
		sendShellSpawned: (data, peerId) => spawned.push({ data, peerId }),
	}
}

const host = { hostNodeHash: 'host-hash' }
const sendDeviceInfoToHost = async () => {}

/**
 * 轮询等待条件成立。
 * @param {() => boolean} predicate 条件
 * @param {number} [timeoutMs] 超时毫秒
 * @returns {Promise<boolean>} 成立返回 true
 */
async function waitFor(predicate, timeoutMs = 10_000) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (predicate()) return true
		await new Promise(resolve => setTimeout(resolve, 20))
	}
	return predicate()
}

/** 当前平台下会运行一段时间的命令。 */
const sleepCommand = process.platform === 'win32'
	? "Start-Sleep -Seconds 1; 'done'"
	: 'sleep 1; echo done'

Deno.test('run_code：忽略非主机 peer', async () => {
	const actions = makeActions()
	const handler = createRunCodeHandler({ host, actions, sendDeviceInfoToHost })
	await handler({ payload: { script: '1+1' }, requestId: 1 }, 'other')
	assert.equal(actions.sent.length, 0)
})

Deno.test('run_code：成功时回传执行结果', async () => {
	const actions = makeActions()
	const handler = createRunCodeHandler({ host, actions, sendDeviceInfoToHost })
	await handler({ payload: { script: '1+1' }, requestId: 2 }, 'host-hash')
	assert.equal(actions.sent.length, 1)
	const { data, peerId } = actions.sent[0]
	assert.equal(peerId, 'host-hash')
	assert.equal(data.requestId, 2)
	assert.equal(data.payload.result, 2)
})

Deno.test('run_code：脚本抛错时错误写入 payload', async () => {
	const actions = makeActions()
	const handler = createRunCodeHandler({ host, actions, sendDeviceInfoToHost })
	await handler({ payload: { script: 'throw new Error("boom")' }, requestId: 3 }, 'host-hash')
	assert.equal(actions.sent.length, 1)
	const { data } = actions.sent[0]
	assert.equal(data.payload.error.message, 'boom')
})

Deno.test('run_code：callbackInfo 回调转发', async () => {
	const actions = makeActions()
	const handler = createRunCodeHandler({ host, actions, sendDeviceInfoToHost })
	await handler({
		payload: { script: "callback('hello')", callbackInfo: { partpath: 'p' }, requestId: 4 },
	}, 'host-hash')
	assert.equal(actions.sent.length, 2)
	const callback = actions.sent[0]
	assert.equal(callback.data.partpath, 'p')
	assert.equal(callback.data.data, 'hello')
})

Deno.test('shell_exec：忽略非主机 peer', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	await handler({ payload: { command: 'echo hi' }, requestId: 1 }, 'other')
	assert.equal(actions.sent.length, 0)
})

Deno.test('shell_exec：不支持的 shell 回传 isError', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	await handler({ payload: { command: 'echo hi', shell: 'csh' }, requestId: 2 }, 'host-hash')
	assert.equal(actions.sent.length, 1)
	assert.equal(actions.sent[0].data.isError, true)
	assert.equal(actions.sent[0].data.payload.error, 'Unsupported shell: csh')
})

Deno.test('shell_exec：默认 shell 执行命令', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	await handler({ payload: { command: 'echo subfount-test' }, requestId: 3 }, 'host-hash')
	assert.equal(actions.sent.length, 1)
	const { data } = actions.sent[0]
	assert.equal(data.isError, undefined)
	assert.equal(data.payload.code, 0)
	assert.match(data.payload.stdout, /subfount-test/)
})

Deno.test('shell_exec：spawn 后立即上报 pid，且早于最终结果', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	const done = handler({ payload: { command: sleepCommand }, requestId: 7 }, 'host-hash')

	assert.ok(await waitFor(() => actions.spawned.length > 0), '未收到 shell_spawned')
	const { data, peerId } = actions.spawned[0]
	assert.equal(peerId, 'host-hash')
	assert.equal(data.requestId, 7)
	assert.equal(typeof data.pid, 'number')
	assert.ok(data.pid > 0)
	assert.equal(actions.sent.length, 0, '结果应晚于 spawn 上报')

	await done
	assert.equal(actions.sent.length, 1)
})

Deno.test('shell_spawned：非主机 peer 不触发', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	await handler({ payload: { command: 'echo hi' }, requestId: 1 }, 'other')
	assert.equal(actions.spawned.length, 0)
})

Deno.test('killProcessTree：按上报的 pid 终止 shell 进程树', async () => {
	const actions = makeActions()
	const handler = createShellExecHandler({ host, actions })
	const longSleep = process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30'
	const done = handler({ payload: { command: longSleep }, requestId: 9 }, 'host-hash')

	assert.ok(await waitFor(() => actions.spawned.length > 0), '未收到 shell_spawned')
	const pid = actions.spawned[0].data.pid
	killProcessTree(pid)

	const finished = await Promise.race([
		done.then(() => true),
		new Promise(resolve => setTimeout(() => resolve(false), 15_000)),
	])
	assert.equal(finished, true, '命令应在被 kill 后很快结束')
	assert.equal(actions.sent.length, 1)
})
