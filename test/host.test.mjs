/* global Deno */
import assert from 'node:assert/strict'

import { createHostAssist, createHostPool, readInfraPolicy } from '../src/host.mjs'

/**
 * 网络层替身：记录 infra 启停、信誉锁与 donor 声明的调用轨迹。
 * @returns {object} p2p 替身
 */
function makeP2pMock() {
	const calls = { startInfra: 0, stopInfra: 0, setTrustSyncDonors: [], lockReputationMax: [], unlockReputationMax: [], setInfraPriority: [] }
	return {
		calls,
		infraRunning: false,
		isInfraRunning() { return this.infraRunning },
		startInfra() { calls.startInfra++; this.infraRunning = true },
		stopInfra() { calls.stopInfra++; this.infraRunning = false },
		setTrustSyncDonors(donors) { calls.setTrustSyncDonors.push(donors) },
		lockReputationMax(locks) { calls.lockReputationMax.push(locks) },
		unlockReputationMax(locks) { calls.unlockReputationMax.push(locks) },
		setInfraPriority(config) { calls.setInfraPriority.push(config) },
		getReputationLocks() { return calls.lockReputationMax.flat().filter((hash, index, all) => all.indexOf(hash) === index) },
		pullReputationFromNode() { return {} },
		setReputationTable() { },
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

Deno.test('applyInfra(true) 已认证：声明 donor 并锁住主机信誉', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	assist.hostNodeHash = 'host-hash'
	await assist.applyInfra(true, true)
	assert.deepEqual(p2p.calls.setTrustSyncDonors, [['host-hash']])
	assert.deepEqual(p2p.calls.lockReputationMax, [['host-hash']])
})

Deno.test('applyInfra(false)：撤销帮扶', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	assist.hostNodeHash = 'host-hash'
	await assist.applyInfra(true, true)
	await assist.applyInfra(false, true)
	assert.deepEqual(p2p.calls.unlockReputationMax, [['host-hash']])
	assert.deepEqual(p2p.calls.setTrustSyncDonors.at(-1), [])
})

Deno.test('revokeHost：清空主机身份（未认证过则不触碰网络层）', async () => {
	const p2p = makeP2pMock()
	const assist = createHostAssist(p2p)
	await assist.revokeHost()
	assert.equal(assist.hostNodeHash, null)
	assert.deepEqual(p2p.calls.unlockReputationMax, [])
})

Deno.test('host pool：一个主机的策略掐不掉另一个主机的 infra', async () => {
	const p2p = makeP2pMock()
	const pool = createHostPool(p2p)
	const first = pool.create()
	const second = pool.create()
	await pool.settled()
	assert.equal(p2p.calls.startInfra, 1)

	first.hostNodeHash = 'first'
	second.hostNodeHash = 'second'
	await first.applyInfra(true, true)
	await second.applyInfra(true, true)
	assert.deepEqual(p2p.calls.setTrustSyncDonors.at(-1), ['first', 'second'])
	assert.deepEqual(p2p.calls.lockReputationMax.at(-1), ['first', 'second'])

	await first.applyInfra(false, true)
	assert.deepEqual(p2p.calls.setTrustSyncDonors.at(-1), ['second'])
	assert.deepEqual(p2p.calls.lockReputationMax.at(-1), ['second'])
	assert.deepEqual(p2p.calls.unlockReputationMax.at(-1), ['first'])
	assert.equal(p2p.infraRunning, true)

	await second.applyInfra(false, true)
	assert.equal(p2p.infraRunning, false)
})

Deno.test('host pool：关闭会话不留下孤立的信誉锁', async () => {
	const p2p = makeP2pMock()
	const pool = createHostPool(p2p)
	const first = pool.create()
	const second = pool.create()
	first.hostNodeHash = 'first'
	second.hostNodeHash = 'second'
	await first.applyInfra(true, true)
	await second.applyInfra(true, true)

	await first.close()
	assert.deepEqual(p2p.calls.setTrustSyncDonors.at(-1), ['second'])
	assert.deepEqual(p2p.calls.unlockReputationMax.at(-1), ['first'])

	await second.close()
	assert.deepEqual(p2p.calls.setInfraPriority.at(-1), { useLocalReputation: false })
	assert.equal(p2p.infraRunning, true)
})

Deno.test('host pool：没有主机会话时遵循 defaultInfra', async () => {
	const p2p = makeP2pMock()
	const pool = createHostPool(p2p)
	pool.defaultInfra = false
	const assist = pool.create()
	await pool.settled()
	assert.equal(p2p.calls.startInfra, 0)
	assert.equal(p2p.calls.stopInfra, 0)

	await assist.applyInfra(false, false)
	assert.equal(p2p.calls.stopInfra, 0)

	assist.hostNodeHash = 'host-hash'
	await assist.applyInfra(true, true)
	assert.equal(p2p.calls.startInfra, 1)

	await assist.close()
	assert.equal(p2p.infraRunning, false)
})
