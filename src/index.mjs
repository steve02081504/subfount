#!/usr/bin/env -S deno run --allow-scripts --allow-all

/**
 * Subfount 内核 / 守护进程
 *
 * - 参与 fount 网络层 infra（overlay 转发 + mailbox）。
 * - 未设置主机：standalone infra。
 * - 设置主机后：一边跑 infra，一边从主机拉取信誉表并优先帮扶主机及其信任节点；
 *   同时接受主机下发的 run_code / shell_exec。
 *
 * 连接配置来自 data/config.json（由 src/panel.mjs 编辑），可传命令行参数临时覆盖：
 *   subfount <host-room-id> <password> [host-node-hash]
 *
 * 运行期间写入 data/daemon.pid（本进程 PID）与 data/status.json（供面板只读展示）。
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { setInterval, clearInterval, setTimeout } from 'node:timers'
import { fileURLToPath } from 'node:url'

import {
	ensureConfigFile, getDataDir, loadConfig, writeDaemonPid, clearDaemonPid, writeStatus,
} from './config.mjs'
import { collectDeviceInfo, generateDeviceId } from './device.mjs'
import { createRunCodeHandler, createShellExecHandler } from './handlers.mjs'
import { createHostAssist, DEVICE_INFO_INTERVAL_MS, readInfraPolicy } from './host.mjs'

/** 主机断开 / 认证失败后的重连延迟（毫秒）。 */
const RECONNECT_DELAY_MS = 5000
/** 认证失败后重新建立房间连接的延迟（毫秒）。 */
const AUTH_RETRY_DELAY_MS = 1000
/** 启动时预热到指定主机节点的轮询尝试次数。 */
const HOST_LINK_WARMUP_ATTEMPTS = 30
/** 预热轮询间隔（毫秒）。 */
const HOST_LINK_WARMUP_INTERVAL_MS = 1000
/** 状态推送间隔（毫秒）。 */
const STATUS_INTERVAL_MS = 5000

process.on('uncaughtException', (err) => {
	if (err?.code === 'ECONNRESET' || err?.code === 'ECONNREFUSED' || err?.message?.includes('socket hang up'))
		return
	console.error('Uncaught exception:', err)
	process.exit(1)
})

// --- 自动引导：确保 deno.json 和 node_modules 存在 ---
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const denoJsonPath = path.join(__dirname, '..', 'deno.json')

if (!fs.existsSync(denoJsonPath)) {
	fs.writeFileSync(denoJsonPath, JSON.stringify({ nodeModulesDir: 'auto' }, null, '\t') + '\n')
	console.log('Created deno.json')
}
else
	try {
		const existing = JSON.parse(fs.readFileSync(denoJsonPath, 'utf-8'))
		if (!existing.nodeModulesDir) {
			existing.nodeModulesDir = 'auto'
			fs.writeFileSync(denoJsonPath, JSON.stringify(existing, null, '\t') + '\n')
			console.log('Updated deno.json (added nodeModulesDir)')
		}
	}
	catch { /* ignore */ }

/** @type {import('npm:on-shutdown').on_shutdown} */
let on_shutdown
/** @type {typeof import('npm:@steve02081504/fount-p2p')} */
let p2p

try {
	; ({ on_shutdown } = await import('npm:on-shutdown'))
	p2p = await import('npm:@steve02081504/fount-p2p')
	await p2p.startNode({ nodeDir: path.join(getDataDir(), 'p2p') })
}
catch (error) {
	console.error('\nFailed to load dependencies:', error.message)
	console.log('\nTo fix:')
	console.log('  1. Ensure deno.json exists in the repository root')
	console.log('  2. Run: deno install --allow-scripts --allow-all --entrypoint src/index.mjs')
	console.log('  3. Re-run this script\n')
	process.exit(1)
}

const args = process.argv.slice(2)

/** 命令行临时覆盖（一次运行有效，不写入 config.json）。 */
const argOverride = args.length >= 2
	? { hostRoomId: args[0], password: args[1], hostNodeHash: args[2]?.trim() || null }
	: null

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
	console.log(`Usage:
  subfount                                    infra only (from data/config.json)
  subfount <host-room-id> <password> [node-hash]
      infra + host worker / priority assist (one-off, does not persist)
`)
	process.exit(0)
}
if (args.length === 1) {
	console.error('Usage: subfount [<host-room-id> <password> [host-node-hash]]')
	process.exit(2)
}

// --- 配置解析（命令行覆盖 > config.json > 默认）---
/**
 * 解析运行配置（命令行覆盖优先于 config.json）。
 * @returns {object} 合并后的配置对象
 */
function resolveConfig() {
	const base = loadConfig()
	return argOverride ? { ...base, ...argOverride } : base
}

let config = resolveConfig()

const host = createHostAssist(p2p)
const localNodeHash = p2p.getNodeHash()
let deviceId = null
let room = null
let authenticated = false
let deviceInfoUpdateInterval = null
let configWatch = null
let statusInterval = null
/** @type {Record<string, Function>} */
const actions = {}

/**
 * 推送运行状态到 data/status.json。
 */
function pushStatus() {
	writeStatus({
		pid: process.pid,
		nodeHash: localNodeHash,
		deviceId,
		mode: config.hostRoomId && config.password ? 'host' : 'infra',
		hostRoomId: config.hostRoomId || null,
		authenticated,
		connectedHost: host.hostNodeHash,
		infraRunning: p2p.isInfraRunning(),
		updatedAt: new Date().toISOString(),
	})
}

/**
 * 启动 infra 网络层。
 */
async function startInfra() {
	if (!p2p.isInfraRunning()) {
		await p2p.startInfra({ logger: console })
		console.log(`Infra running (nodeHash=${localNodeHash})`)
	}
	pushStatus()
}

/**
 * 停止 infra 网络层。
 */
async function stopInfra() {
	if (p2p.isInfraRunning()) await p2p.stopInfra()
	pushStatus()
}

/**
 * 采集并向主机上报设备信息。
 */
async function sendDeviceInfoToHost() {
	const info = await collectDeviceInfo()
	if (actions.sendDeviceInfo && host.hostNodeHash && authenticated)
		await actions.sendDeviceInfo(info, host.hostNodeHash)
}

const handleRunCode = createRunCodeHandler({ host, actions, sendDeviceInfoToHost })
const handleShellExec = createShellExecHandler({ host, actions })

/**
 * 通过 scope room 连接到主机。每次调用（含 5s 重试）都会重读配置，
 * 因此 config.json 的改动无需重启即可在下一次连接尝试生效。
 */
async function connectViaP2P() {
	config = resolveConfig()
	if (!(config.hostRoomId && config.password)) {
		// 配置已清空主机：转入纯 infra
		if (!p2p.isInfraRunning()) await startInfra()
		pushStatus()
		return
	}
	try {
		console.log('Connecting to host...')
		deviceId = await generateDeviceId()
		pushStatus()

		if (config.hostNodeHash) {
			const { getLink, ensureLinkToNode } = await import('npm:@steve02081504/fount-p2p/transport/link_registry')
			for (let attempt = 0; attempt < HOST_LINK_WARMUP_ATTEMPTS; attempt++) {
				if (getLink(config.hostNodeHash)) break
				void ensureLinkToNode(config.hostNodeHash).catch(() => { })
				await new Promise(resolve => setTimeout(resolve, HOST_LINK_WARMUP_INTERVAL_MS))
			}
			if (!getLink(config.hostNodeHash))
				console.warn('subfount: no link to host after warmup', config.hostNodeHash)
		}

		room = p2p.createGroupLinkSet({
			groupId: `subfount:${config.hostRoomId}`,
			scope: `subfount:${config.hostRoomId}`,
			roomSecret: config.password,
			members: config.hostNodeHash ? [config.hostNodeHash] : [],
			dialAll: true,
			autoconnect: true,
		})
		await room.start()

		const actionMap = {
			authenticate: ['sendAuth', 'getAuth'],
			device_info: ['sendDeviceInfo', 'getDeviceInfo'],
			response: ['sendResponse', null],
			run_code: [null, 'getRunCode'],
			callback: ['sendCallback', null],
			shell_exec: [null, 'getShellExec'],
			infra: [null, 'getInfra'],
		}

		for (const [name, [sendName, getName]] of Object.entries(actionMap)) {
			const [send, get] = room.makeAction(name)
			if (sendName) actions[sendName] = send
			if (getName) actions[getName] = get
		}

		actions.getAuth((data, peerId) => {
			if (config.hostNodeHash && peerId !== config.hostNodeHash) return
			if (data.type === 'authenticated') {
				authenticated = true
				host.hostNodeHash = peerId
				console.log('✓ Connected to host')
				void host.applyInfra(readInfraPolicy(data), authenticated)
				void sendDeviceInfoToHost()
				if (deviceInfoUpdateInterval) clearInterval(deviceInfoUpdateInterval)
				deviceInfoUpdateInterval = setInterval(sendDeviceInfoToHost, DEVICE_INFO_INTERVAL_MS).unref()
				pushStatus()
			}
			else if (data.type === 'auth_error') {
				console.log('✗ Authentication failed, retrying in 5 seconds...')
				setTimeout(() => {
					if (room) void room.leave()
					setTimeout(connectViaP2P, AUTH_RETRY_DELAY_MS)
				}, RECONNECT_DELAY_MS)
			}
		})

		actions.getInfra((data, peerId) => {
			if (!authenticated || peerId !== host.hostNodeHash) return
			void host.applyInfra(readInfraPolicy(data), authenticated)
			pushStatus()
		})

		/**
		 * 包装处理器，仅放行已认证主机的请求。
		 * @param {Function} handler 原始消息处理器
		 * @returns {Function} 包装后的消息处理函数
		 */
		const handleAuthenticatedRequest = (handler) => (message, peerId) => {
			if (authenticated && peerId === host.hostNodeHash) handler(message, peerId)
		}
		actions.getRunCode(handleAuthenticatedRequest(handleRunCode))
		actions.getShellExec(handleAuthenticatedRequest(handleShellExec))

		room.onPeerJoin((peerId) => {
			if (config.hostNodeHash && peerId !== config.hostNodeHash) return
			if (!authenticated && actions.sendAuth && !host.hostNodeHash) {
				console.log('Host discovered, sending authentication...')
				host.hostNodeHash = peerId
				actions.sendAuth({ password: config.password, deviceId }, peerId)
			}
		})

		room.onPeerLeave((peerId) => {
			if (peerId === host.hostNodeHash) {
				console.log('✗ Disconnected from host (standalone infra default)')
				authenticated = false
				clearInterval(deviceInfoUpdateInterval)
				deviceInfoUpdateInterval = null
				void host.onHostDisconnected()
				pushStatus()
			}
		})
	}
	catch (error) {
		console.error('Connection failed:', error.message)
		console.log('Retrying in 5 seconds...')
		setTimeout(connectViaP2P, RECONNECT_DELAY_MS)
	}
}

/** 配置热更新：主机模式 <-> infra 模式的切换实时生效。 */
async function onConfigChanged() {
	const next = resolveConfig()
	const hadHost = Boolean(config.hostRoomId && config.password)
	const hasHost = Boolean(next.hostRoomId && next.password)
	config = next
	if (hasHost && !hadHost) {
		await stopInfra()
		void connectViaP2P()
	}
	else if (!hasHost && hadHost) {
		authenticated = false
		host.hostNodeHash = null
		clearInterval(deviceInfoUpdateInterval)
		deviceInfoUpdateInterval = null
		if (room) { void room.leave(); room = null }
		await host.onHostDisconnected()
	}
	pushStatus()
}

/**
 * 监听 config.json 变更，实时应用新配置。
 */
function startConfigWatcher() {
	try {
		configWatch = fs.watch(path.join(getDataDir(), 'config.json'), (event) => {
			if (event !== 'change') return
			void onConfigChanged()
		})
	}
	catch { /* ignore */ }
}

/** 优雅停机：subfount shutdown 写入 data/stop.request，内核清理后以 0 退出（keepalive 不会重启）。 */
let shuttingDown = false

/**
 * 清理定时器、PID、房间与 infra（幂等，可安全重复调用）。
 */
async function shutdown() {
	if (shuttingDown) return
	shuttingDown = true
	console.log('\nShutting down...')
	clearInterval(deviceInfoUpdateInterval)
	clearInterval(statusInterval)
	try { configWatch?.close() } catch { /* ignore */ }
	clearDaemonPid()
	if (room) await room.leave()
	if (p2p.isInfraRunning()) await p2p.stopInfra()
}

/**
 * 优雅停机：清理完成后退出进程。
 */
async function gracefulStop() {
	await shutdown()
	process.exit(0)
}

/**
 * 监听 data/stop.request，收到后触发优雅停机。
 */
function startStopWatcher() {
	const stopFile = path.join(getDataDir(), 'stop.request')
	try {
		fs.watch(getDataDir(), (_event, filename) => {
			if (filename === 'stop.request' && fs.existsSync(stopFile)) 
				void gracefulStop()
			
		})
	}
	catch { /* ignore */ }
}

// --- 主流程 ---
ensureConfigFile()
writeDaemonPid()
startConfigWatcher()
startStopWatcher()

statusInterval = setInterval(pushStatus, STATUS_INTERVAL_MS).unref()

if (config.hostRoomId && config.password)
	await connectViaP2P()
else {
	await startInfra()
	console.log('No host configured — infra overlay/mailbox only')
}

on_shutdown(shutdown)
