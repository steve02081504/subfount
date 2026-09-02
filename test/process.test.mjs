import assert from 'node:assert/strict'
import process from 'node:process'

import { isProcessAlive, killPid } from '../src/process.mjs'

Deno.test('isProcessAlive：无效 pid 返回 false', () => {
	for (const pid of [null, undefined, 0, -1, 1.5, 'abc', NaN]) {
		assert.equal(isProcessAlive(pid), false, `pid=${pid}`)
	}
})

Deno.test('isProcessAlive：自身进程存活', () => {
	assert.equal(isProcessAlive(process.pid), true)
})

Deno.test('killPid：空值安全忽略', () => {
	killPid(null)
	killPid(undefined)
	killPid(0)
})
