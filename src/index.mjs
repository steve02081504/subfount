#!/usr/bin/env -S deno run --allow-scripts --allow-all

/**
 * Subfount 内核 / 守护进程
 *
 * - 参与 fount 网络层 infra（overlay 转发 + mailbox）。
 * - 未设置主机：standalone infra。
 * - 设置主机后：一边跑 infra，一边从主机拉取信誉表并优先帮扶主机及其信任节点；
 *   同时接受主机下发的 run_code / shell_exec。每个主机一个独立会话，互不影响。
 *
 * 连接配置来自 data/config.json（由 src/panel.mjs 编辑），命令行参数会持久化追加一个主机：
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
	ensureConfigFile, getDataDir, loadConfig, writeDaemonPid, clearDaemonPid, writeStatus, configuredHosts, addConfiguredHost,
} from './config.mjs'
import { collectDeviceInfo, generateDeviceId } from './device.mjs'
import { createRunCodeHandler, createShellExecHandler } from './handlers.mjs'
import { createHostPool, DEVICE_INFO_INTERVAL_MS, readInfraPolicy } from './host.mjs'
import { killProcessTree } from './process.mjs'

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

const args = process.argv.slice(2)

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
	console.log(`Usage:
  subfount                                    infra only (from data/config.json)
  subfount <host-room-id> <password> [node-hash]
      infra + host worker / priority assist (adds or updates a persistent host (other hosts remain connected))
`)
	process.exit(0)
}
if (args.length === 1) {
	console.error('Usage: subfount [<host-room-id> <password> [host-node-hash]]')
	process.exit(2)
}

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

/** 命令行传入的主机（一次启动有效，但按主机配置持久化）。 */
if (args.length >= 2)
	addConfiguredHost({ hostRoomId: args[0], password: args[1], hostNodeHash: args[2]?.trim() || null })

let config = loadConfig()
const sessions = new Map()
const localNodeHash = p2p.getNodeHash()
const hostPool = createHostPool(p2p)
let statusInterval = null
let configWatch = null

/**
 * 推送运行状态到 data/status.json。
 */
function pushStatus() {
	const hosts = [...sessions.values()].map(session => session.status())
	const connected = hosts.filter(host => host.authenticated).map(host => host.connectedHost)
	writeStatus({
		pid: process.pid,
		nodeHash: localNodeHash,
		hosts,
		mode: hosts.length ? 'host' : 'infra',
		authenticated: connected.length > 0,
		connectedHost: connected.join(', ') || null,
		infraRunning: p2p.isInfraRunning(),
		updatedAt: new Date().toISOString(),
	})
}

/**
 * 为一个已配置的主机建立独立会话（连接、认证、收指令、定期上报设备信息）。
 * @param {{hostRoomId: string, password: string, hostNodeHash: string|null}} hostConfig 该主机的配置
 * @returns {object} 主机会话
 */
function createHostSession(hostConfig) {
	const config = hostConfig
	const host = hostPool.create()
	const retryTimers = new Set()
	const actions = {}
	let disposed = false
	let deviceId = null
	let room = null
	let authenticated = false
	let deviceInfoUpdateInterval = null

	/**
	 * 延后执行一次（用于重连），停止时自动丢弃。
	 * @param {Function} fn 要执行的函数
	 * @param {number} delay 延迟毫秒
	 */
	function later(fn, delay) {
		const timer = setTimeout(() => { retryTimers.delete(timer); if (!disposed) void fn() }, delay)
		retryTimers.add(timer)
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
	 * 注册房间动作：认证、设备信息、infra 策略与主机指令。
	 */
	function wireRoomActions() {
		const actionMap = {
			authenticate: ['sendAuth', 'getAuth'],
			device_info: ['sendDeviceInfo', 'getDeviceInfo'],
			response: ['sendResponse', null],
			run_code: [null, 'getRunCode'],
			callback: ['sendCallback', null],
			shell_exec: [null, 'getShellExec'],
			shell_spawned: ['sendShellSpawned', null],
			kill: [null, 'getKill'],
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
				console.log(`✓ Connected to host ${config.hostRoomId}`)
				void host.applyInfra(readInfraPolicy(data), authenticated)
				void sendDeviceInfoToHost()
				clearInterval(deviceInfoUpdateInterval)
				deviceInfoUpdateInterval = setInterval(sendDeviceInfoToHost, DEVICE_INFO_INTERVAL_MS).unref()
				pushStatus()
			}
			else if (data.type === 'auth_error') {
				console.error(`✗ Authentication failed for ${config.hostRoomId}, retrying in ${RECONNECT_DELAY_MS / 1000} seconds...`)
				later(() => {
					room.leave()
					later(connect, AUTH_RETRY_DELAY_MS)
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
		const handleAuthenticatedRequest = handler => (message, peerId) => {
			if (authenticated && peerId === host.hostNodeHash) handler(message, peerId)
		}
		actions.getRunCode(handleAuthenticatedRequest(handleRunCode))
		actions.getShellExec(handleAuthenticatedRequest(handleShellExec))
		actions.getKill(handleAuthenticatedRequest(({ pid }) => {
			if (pid) killProcessTree(pid)
		}))

		room.onPeerJoin((peerId) => {
			if (config.hostNodeHash && peerId !== config.hostNodeHash) return
			if (!authenticated && !host.hostNodeHash) {
				console.log(`Host ${config.hostRoomId} discovered, sending authentication...`)
				host.hostNodeHash = peerId
				actions.sendAuth({ password: config.password, deviceId }, peerId)
			}
		})

		room.onPeerLeave((peerId) => {
			if (peerId !== host.hostNodeHash) return
			console.error(`✗ Disconnected from host ${config.hostRoomId} (standalone infra default)`)
			authenticated = false
			clearInterval(deviceInfoUpdateInterval)
			deviceInfoUpdateInterval = null
			void host.revokeHost()
			pushStatus()
		})
	}

	/**
	 * 连接到主机：预热链路、建房间、注册动作；失败则稍后重试。
	 */
	async function connect() {
		if (disposed) return
		try {
			console.log(`Connecting to host ${config.hostRoomId}...`)
			deviceId = await generateDeviceId()
			pushStatus()

			if (config.hostNodeHash) {
				const { getLink, ensureLinkToNode } = await import('npm:@steve02081504/fount-p2p/transport/link_registry')
				for (let attempt = 0; attempt < HOST_LINK_WARMUP_ATTEMPTS; attempt++) {
					if (getLink(config.hostNodeHash)) break
					void ensureLinkToNode(config.hostNodeHash).catch(() => { })
					if (disposed) return
					await new Promise(resolve => setTimeout(resolve, HOST_LINK_WARMUP_INTERVAL_MS))
				}
				if (!getLink(config.hostNodeHash))
					console.warn(`subfount: no link to host ${config.hostNodeHash} after warmup`)
			}

			if (disposed) return
			room = p2p.createGroupLinkSet({
				groupId: `subfount:${config.hostRoomId}`,
				scope: `subfount:${config.hostRoomId}`,
				roomSecret: config.password,
				members: config.hostNodeHash ? [config.hostNodeHash] : [],
				dialAll: true,
				autoconnect: true,
			})
			await room.start()
			if (disposed) {
				await room.leave()
				return
			}
			wireRoomActions()
		}
		catch (error) {
			console.error(`Connection to ${config.hostRoomId} failed:`, error.message)
			console.log(`Retrying in ${RECONNECT_DELAY_MS / 1000} seconds...`)
			later(connect, RECONNECT_DELAY_MS)
		}
	}

	return {
		config,
		connect,
		/**
		 * 会话状态（供 status.json）。
		 * @returns {object} 主机会话状态
		 */
		status: () => ({ hostRoomId: config.hostRoomId, authenticated, connectedHost: host.hostNodeHash }),
		/**
		 * 关闭会话：停止重连、退出房间、撤销帮扶。
		 */
		async close() {
			disposed = true
			for (const timer of retryTimers) clearTimeout(timer)
			clearInterval(deviceInfoUpdateInterval)
			if (room) await room.leave()
			await host.close()
		},
	}
}

let reconcile = Promise.resolve()

/**
 * 让运行中的会话与 config.json 对齐：新增缺失的主机、重建配置变化的主机、关闭已删除的主机。
 * @returns {Promise<void>} 对齐完成
 */
function onConfigChanged() {
	reconcile = reconcile.then(async () => {
		config = loadConfig()
		const configured = configuredHosts(config)
		hostPool.defaultInfra = readInfraPolicy(config)
		for (const [hostRoomId, session] of sessions) {
			const replacement = configured.find(host => host.hostRoomId === hostRoomId)
			if (replacement && JSON.stringify(replacement) === JSON.stringify(session.config)) continue
			sessions.delete(hostRoomId)
			await session.close()
		}
		for (const host of configured) {
			if (sessions.has(host.hostRoomId)) continue
			const session = createHostSession(host)
			sessions.set(host.hostRoomId, session)
			void session.connect()
		}
		if (!sessions.size && !p2p.isInfraRunning() && hostPool.defaultInfra) await p2p.startInfra({ logger: console })
		pushStatus()
	}).catch(error => console.error('Configuration update failed:', error))
	return reconcile
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
	clearInterval(statusInterval)
	try { configWatch?.close() } catch { /* ignore */ }
	clearDaemonPid()
	await Promise.all([...sessions.values()].map(session => session.close()))
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

await onConfigChanged()

on_shutdown(shutdown)
