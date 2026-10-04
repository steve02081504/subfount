/* global Deno */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
	addConfiguredHost, clearDaemonPid, configuredHosts, DEFAULT_CONFIG, ensureConfigFile, loadConfig,
	readDaemonPid, readStatus, removeConfiguredHost, saveConfig, setConfiguredHosts, writeDaemonPid, writeStatus,
} from '../src/config.mjs'
import { REPO_ROOT } from '../src/scripts/checks/repo_root.mjs'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subfount-test-'))
process.env.SUBFOUNT_DATA_DIR = tmpDir

Deno.test('loadConfig：无文件时返回默认配置', () => {
	assert.deepEqual(loadConfig(), DEFAULT_CONFIG)
})

Deno.test('loadConfig：部分配置与默认值合并', () => {
	saveConfig({ hosts: [{ hostRoomId: 'room', password: 'pw' }] })
	assert.deepEqual(loadConfig(), { ...DEFAULT_CONFIG, hosts: [{ hostRoomId: 'room', password: 'pw' }] })
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

Deno.test('configuredHosts：补齐 hostNodeHash 并按 roomId 去重', () => {
	assert.deepEqual(configuredHosts({
		hosts: [
			{ hostRoomId: 'one', password: 'p1' },
			{ hostRoomId: 'two', password: 'p2', hostNodeHash: 'hash' },
			{ hostRoomId: 'one', password: 'updated' },
		],
	}), [
		{ hostRoomId: 'one', password: 'updated', hostNodeHash: null },
		{ hostRoomId: 'two', password: 'p2', hostNodeHash: 'hash' },
	])
	assert.deepEqual(configuredHosts({ hosts: [] }), [])
})

Deno.test('addConfiguredHost / removeConfiguredHost：保留其它主机', () => {
	saveConfig({ ...DEFAULT_CONFIG })
	addConfiguredHost({ hostRoomId: 'one', password: 'p1' })
	addConfiguredHost({ hostRoomId: 'two', password: 'p2' })
	addConfiguredHost({ hostRoomId: 'one', password: 'p1-updated', hostNodeHash: 'hash' })
	assert.deepEqual(configuredHosts(loadConfig()), [
		{ hostRoomId: 'one', password: 'p1-updated', hostNodeHash: 'hash' },
		{ hostRoomId: 'two', password: 'p2', hostNodeHash: null },
	])
	removeConfiguredHost('one')
	assert.deepEqual(configuredHosts(loadConfig()), [{ hostRoomId: 'two', password: 'p2', hostNodeHash: null }])
	setConfiguredHosts([])
	assert.deepEqual(configuredHosts(loadConfig()), [])
})

Deno.test('README 示例与配置加载器保持一致', () => {
	const readme = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'Readme.en-UK.md'), 'utf-8')
	const example = [...readme.matchAll(/```json\n([\s\S]*?)```/g)].map(match => match[1]).filter(block => block.includes('"hosts"')).at(-1)
	const config = { ...DEFAULT_CONFIG, ...JSON.parse(example) }
	assert.deepEqual(configuredHosts(config), [{ hostRoomId: '<host-room-id>', password: '<password>', hostNodeHash: '<node-hash>' }])
})

Deno.test('清理临时数据目录', () => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})
