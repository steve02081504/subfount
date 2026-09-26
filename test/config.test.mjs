import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
	clearDaemonPid, DEFAULT_CONFIG, ensureConfigFile, loadConfig, readDaemonPid, readStatus,
	saveConfig, writeDaemonPid, writeStatus,
} from '../src/config.mjs'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subfount-test-'))
process.env.SUBFOUNT_DATA_DIR = tmpDir

Deno.test('loadConfig：无文件时返回默认配置', () => {
	assert.deepEqual(loadConfig(), DEFAULT_CONFIG)
})

Deno.test('loadConfig：部分配置与默认值合并', () => {
	saveConfig({ hostRoomId: 'room' })
	assert.deepEqual(loadConfig(), { ...DEFAULT_CONFIG, hostRoomId: 'room' })
})

Deno.test('loadConfig：损坏文件回退默认', () => {
	fs.writeFileSync(path.join(tmpDir, 'config.json'), '{broken')
	assert.deepEqual(loadConfig(), DEFAULT_CONFIG)
})

Deno.test('ensureConfigFile：缺失时创建默认配置', () => {
	fs.rmSync(path.join(tmpDir, 'config.json'), { force: true })
	ensureConfigFile()
	assert.deepEqual(loadConfig(), DEFAULT_CONFIG)
})

Deno.test('daemon.pid 往返与幂等清除', () => {
	writeDaemonPid(12345)
	assert.equal(readDaemonPid(), 12345)
	clearDaemonPid()
	assert.equal(readDaemonPid(), null)
	clearDaemonPid()
})

Deno.test('status 原子写往返', () => {
	writeStatus({ pid: 1, nodeHash: 'abc' })
	assert.deepEqual(readStatus(), { pid: 1, nodeHash: 'abc' })
})

fs.rmSync(tmpDir, { recursive: true, force: true })
