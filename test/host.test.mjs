import assert from 'node:assert/strict'

import { createHostAssist, readInfraPolicy } from '../src/host.mjs'

function makeP2pMock() {
	const calls = {
		startInfra: 0,
		stopInfra: 0,
		setTrustSyncDonors: [],
		lockReputationMax: [],
		unlockReputationMax: [],
		setInfraPriority: [],
	}
	return {
		calls,
		infraRunning: false,
		isInfraRunning() { return this.infraRunning },
		startInfra() { calls.startInfra++; this.infraRunning = true },
		stopInfra() { calls.stopInfra++; this.infraRunning = false },
		setTrustSyncDonors(list) { calls.setTrustSyncDonors.push(list) },
		lockReputationMax(list) { calls.lockReputationMax.push(list) },
		unlockReputationMax(list) { calls.unlockReputationMax.push(list) },
		setInfraPriority(cfg) { calls.setInfraPriority.push(cfg) },
		pullReputationFromNode() { return {} },
		setReputationTable() {},
		getReputationLocks() { return [] },
	}
}

Deno.test('readInfraPolicy：默认启用', () => {
	assert.equal(readInfraPolicy(), true)
	assert.equal(readInfraPolicy({}), true)
	assert.equal(readInfraPolicy({ infra: true }), true)
})

Deno.test('readInfraPolicy：infra=false 禁用', () => {
	assert.equal(readInfraPolicy({ infra: false }), false)
})

Deno.test('applyInfra(false)：停止 infra', async () => {
	const p2p = makeP2pMock()
	p2p.infraRunning = true
	const assist = createHostAssist(p2p)
	await assist.applyInfra(false, false)
	assert.equal(p2p.calls.stopInfra, 1)
	assert.equal(p2p.calls.startInfra, 0)
	assert.equal(p2p.infraRunning, false)
})

Deno.test('applyInfra(true) 未认证：仅启动 infra', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	await assist.applyInfra(true, false)
	assert.equal(p2p.calls.startInfra, 1)
	assert.equal(p2p.calls.setTrustSyncDonors.length, 0)
})

Deno.test('applyInfra(true) 已认证：启用主机优先帮扶', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	assist.hostNodeHash = 'host-hash'
	await assist.applyInfra(true, true)
	assert.equal(p2p.calls.startInfra, 1)
	assert.deepEqual(p2p.calls.setTrustSyncDonors, [['host-hash']])
	assert.deepEqual(p2p.calls.lockReputationMax, [['host-hash']])
	assert.deepEqual(p2p.calls.setInfraPriority, [{ useLocalReputation: true }])
	await assist.onHostDisconnected()
})

Deno.test('onHostDisconnected：恢复 standalone infra', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	assist.hostNodeHash = 'host-hash'
	await assist.applyInfra(true, true)
	await assist.onHostDisconnected()
	assert.deepEqual(p2p.calls.unlockReputationMax, [['host-hash']])
	assert.deepEqual(p2p.calls.setTrustSyncDonors.slice(-1), [[]])
	assert.deepEqual(p2p.calls.setInfraPriority.slice(-1), [{ useLocalReputation: false }])
	assert.equal(assist.hostNodeHash, null)
	assert.equal(p2p.infraRunning, true)
})
