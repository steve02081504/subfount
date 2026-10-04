import assert from 'node:assert/strict'
import { createCallbackSessionRuntime } from '../src/callback_sessions.mjs'

/** 为通用生产者构造隔离的消息通道。 */
function fixture(evaluate, options = {}) {
	const frames = []
	const runtime = createCallbackSessionRuntime({ authorize: peer => peer === 'host', send: frame => frames.push(frame), evaluate, ...options })
	return { runtime, frames, open: id => runtime.handle({ op: 'open', id, script: 'producer' }, 'host') }
}

Deno.test('callback sessions: initialization returns while later events remain live, ready precedes early events', async () => {
	let context, released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => {
		context = callbackSession
		context.onDispose(() => released++)
		context.emit({ early: true })
		return { initialized: true }
	})
	try {
		await open('first')
		await Promise.resolve()
		context.emit({ later: true })
		await Promise.resolve()
		assert.deepEqual(frames.map(frame => frame.type), ['ready', 'event', 'event'])
		assert.deepEqual(frames.filter(frame => frame.type === 'event').map(frame => frame.seq), [1, 2])
		await runtime.handle({ op: 'cancel', id: 'first' }, 'host')
		assert.equal(released, 1)
		assert.equal(context.signal.aborted, true)
		assert.equal(context.emit('late'), false)
		assert.equal(runtime.size, 0)
	} finally { runtime.dispose() }
})

Deno.test('callback sessions: unauthorized hosts cannot open, renew or cancel', async () => {
	const { runtime, open } = fixture(() => null)
	try {
		await runtime.handle({ op: 'open', id: 'bad', script: 'x' }, 'other')
		assert.equal(runtime.size, 0)
		await open('good')
		await runtime.handle({ op: 'cancel', id: 'good' }, 'other')
		assert.equal(runtime.size, 1)
	} finally { runtime.dispose() }
})

Deno.test('callback sessions: cancellation during initialization releases late resources without ready', async () => {
	let complete, context, released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => {
		context = callbackSession
		return new Promise(resolve => { complete = resolve })
	})
	const opening = open('race')
	await runtime.handle({ op: 'cancel', id: 'race' }, 'host')
	context.onDispose(() => released++)
	complete(null)
	await opening
	assert.equal(released, 1)
	assert.equal(frames.some(frame => frame.type === 'ready'), false)
	assert.equal(runtime.size, 0)
	runtime.dispose()
})

Deno.test('callback sessions: cancel arriving before open prevents a late producer resurrection', async () => {
	let starts = 0
	const { runtime, open } = fixture(() => starts++)
	await runtime.handle({ op: 'cancel', id: 'reordered' }, 'host')
	await open('reordered')
	assert.equal(starts, 0)
	runtime.dispose()
})

Deno.test('callback sessions: expired lease and disconnect release resources exactly once', async () => {
	let released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => callbackSession.onDispose(() => released++), { leaseMs: 20 })
	try {
		await open('expires')
		await new Promise(resolve => setTimeout(resolve, 50))
		assert.equal(runtime.size, 0)
		assert.equal(frames.at(-1).reason, 'lease-expired')
		await open('disconnects')
		runtime.disconnect('host')
		runtime.disconnect('host')
		assert.equal(released, 2)
	} finally { runtime.dispose() }
})

Deno.test('callback sessions: setup failures and bounded overflow close the producer', async () => {
	const failure = fixture(() => { throw new Error('boom') })
	await failure.open('fails')
	assert.match(failure.frames.at(-1).reason, /setup-error: boom/)
	failure.runtime.dispose()
	let released = 0
	const overflow = fixture((_script, { callbackSession }) => {
		callbackSession.onDispose(() => released++)
		callbackSession.emit(1)
		callbackSession.emit(2)
		callbackSession.emit(3)
	}, { maxFrames: 2 })
	await overflow.open('overflows')
	assert.equal(overflow.frames.at(-1).reason, 'callback-overflow')
	assert.equal(released, 1)
	overflow.runtime.dispose()
})

Deno.test('callback sessions: heartbeat renews lease and send rejection disposes producer', async () => {
	let released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => callbackSession.onDispose(() => released++))
	try {
		await open('renew')
		await runtime.handle({ op: 'renew', id: 'renew' }, 'host')
		assert.equal(frames.at(-1).type, 'heartbeat')
	} finally { runtime.dispose() }
	const broken = fixture((_script, { callbackSession }) => callbackSession.onDispose(() => released++), { send: () => { throw new Error('offline') } })
	await broken.open('offline')
	assert.equal(broken.runtime.size, 0)
	assert.equal(released, 2)
	broken.runtime.dispose()
})

Deno.test('callback sessions: stalled send has a bounded byte queue and overflow aborts its producer', async () => {
	let context, releaseSend, released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => {
		context = callbackSession
		callbackSession.onDispose(() => released++)
	}, {
		maxQueuedBytes: 10,
		send: frame => {
			if (frame.type === 'event') return new Promise(resolve => { releaseSend = resolve })
			frames.push(frame)
		},
	})
	try {
		await open('backpressure')
		context.emit('sending')
		context.emit('queued')
		assert.equal(context.emit('overflow'), false)
		assert.equal(runtime.size, 0)
		assert.equal(released, 1)
		await Promise.resolve()
		assert.equal(frames.at(-1).reason, 'callback-overflow')
	} finally { releaseSend?.(); runtime.dispose() }
})

Deno.test('callback sessions: disconnect stops a live producer and silences it immediately', async () => {
	let context, released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => {
		context = callbackSession
		callbackSession.onDispose(() => released++)
	}, { maxQueuedBytes: 1024 })
	try {
		await open('live')
		assert.equal(context.emit('before'), true)
		runtime.disconnect('host')
		const accepted = frames.length
		assert.equal(context.emit('after'), false)
		assert.equal(released, 1)
		assert.equal(runtime.size, 0)
		assert.equal(frames.length, accepted)
		assert.equal(context.signal.aborted, true)
	} finally { runtime.dispose() }
})

Deno.test('callback sessions: producer completion drains accepted events before the terminal frame', async () => {
	let released = 0
	const { runtime, frames, open } = fixture((_script, { callbackSession }) => {
		callbackSession.onDispose(() => released++)
		callbackSession.emit('one')
		callbackSession.emit('two')
		callbackSession.close()
		assert.equal(callbackSession.emit('late'), false)
		return 'initialized'
	})
	try {
		await open('completes')
		await new Promise(resolve => setTimeout(resolve, 0))
		assert.deepEqual(frames.map(frame => frame.type), ['ready', 'event', 'event', 'end'])
		assert.equal(frames.at(-1).reason, 'completed')
		assert.equal(released, 1)
		assert.equal(runtime.size, 0)
	} finally { runtime.dispose() }
})
