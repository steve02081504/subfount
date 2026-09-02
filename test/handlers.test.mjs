import assert from 'node:assert/strict'

import { createRunCodeHandler, createShellExecHandler } from '../src/handlers.mjs'

function makeActions() {
	const sent = []
	return {
		sent,
		sendResponse: (data, peerId) => sent.push({ data, peerId }),
		sendCallback: (data, peerId) => sent.push({ data, peerId }),
	}
}

const host = { hostNodeHash: 'host-hash' }
const sendDeviceInfoToHost = async () => {}

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
