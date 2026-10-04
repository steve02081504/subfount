/* global Deno */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { claimLocalService } from '../src/local_service.mjs'

Deno.test('single instance forwards launch and allows only official verification origin', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'subfount-instance-'))
	process.env.SUBFOUNT_INSTANCE_DIR = directory
	let received
	let challenge
	const port = 19000 + Math.floor(Math.random() * 20000)
	const first = await claimLocalService({
		port,
		args: [],
		onLaunch: args => { received = args },
		getStatus: () => ({ service: 'subfount', nodeHash: 'a'.repeat(64) }),
		prove: options => { challenge = options; return { status: 'verified', nodeHash: 'a'.repeat(64) } },
	})
	try {
		const second = await claimLocalService({ port, args: ['host', 'password'], onLaunch() { }, getStatus() { }, prove() { } })
		assert.equal(second, null)
		assert.deepEqual(received, ['host', 'password'])

		const preflight = await fetch(`http://127.0.0.1:${port}/api/p2p/verification/local`, {
			method: 'OPTIONS',
			headers: { Origin: 'https://steve02081504.github.io', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Private-Network': 'true' },
		})
		assert.equal(preflight.status, 204)
		assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://steve02081504.github.io')
		assert.equal(preflight.headers.get('Access-Control-Allow-Private-Network'), 'true')
		await preflight.text()

		const denied = await fetch(`http://127.0.0.1:${port}/api/ping`, { headers: { Origin: 'https://evil.example' } })
		assert.equal(denied.status, 403)
		await denied.text()

		const query = new URLSearchParams({ requesterNodeHash: 'b'.repeat(64), challenge: 'c'.repeat(64), expiresAt: String(Date.now() + 5000) })
		const verified = await fetch(`http://127.0.0.1:${port}/api/p2p/verification/local?${query}`, { headers: { Origin: 'https://steve02081504.github.io' } })
		assert.equal((await verified.json()).status, 'verified')
		assert.equal(challenge.requesterNodeHash, 'b'.repeat(64))

		const broken = await fetch(`http://127.0.0.1:${port}/api/verify`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{broken',
		})
		assert.equal(broken.status, 400)
		assert.equal((await broken.json()).status, 'failed')
	}
	finally {
		await first.close()
		fs.rmSync(directory, { recursive: true, force: true })
		delete process.env.SUBFOUNT_INSTANCE_DIR
	}
})
