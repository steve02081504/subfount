#!/usr/bin/env -S deno run --allow-scripts --allow-all

/**
 * Subfount 配置面板（TUI，独立进程）
 *
 * - 与内核（守护进程）分离：不启动 p2p 节点，只读写 data/config.json、
 *   data/daemon.pid、data/status.json，并负责启动/停止守护进程。
 * - 所有文案走 src/locales（en-UK / zh-CN / ja-JP）。
 */

/* global Deno */

import path from 'node:path'
import process from 'node:process'

import inquirer from 'npm:inquirer'

import {
	ensureConfigFile, getDataDir, getRootDir, loadConfig, readDaemonPid, readStatus, saveConfig, configuredHosts, addConfiguredHost, removeConfiguredHost,
} from './config.mjs'
import { t } from './i18n.mjs'
import { isProcessAlive, killPid } from './process.mjs'

/** 停止进程时等待其退出的轮询尝试次数与间隔（毫秒）。 */
const STOP_POLL_ATTEMPTS = 30
const STOP_POLL_INTERVAL_MS = 100

ensureConfigFile()

let cfg = loadConfig()

/**
 * 返回平台对应的启动器脚本路径。
 * @returns {string} 启动器脚本绝对路径
 */
function launcherPath() {
	return path.join(getRootDir(), 'path', process.platform === 'win32' ? 'subfount.bat' : 'subfount')
}

/**
 * 通过启动器脚本在后台启动守护进程。
 * @param {string} launcher 启动器脚本路径
 */
function startDaemonViaLauncher(launcher) {
	const dataDir = getDataDir()
	const logOut = Deno.openSync(path.join(dataDir, 'daemon.log'), { create: true, write: true, append: true })
	const logErr = Deno.openSync(path.join(dataDir, 'daemon.err.log'), { create: true, write: true, append: true })
	const cmd = process.platform === 'win32' ? 'cmd.exe' : 'sh'
	const args = process.platform === 'win32' ? ['/c', launcher, 'background', 'keepalive'] : [launcher, 'background', 'keepalive']
	new Deno.Command(cmd, { args, stdout: { file: logOut }, stderr: { file: logErr } }).spawn()
}

/**
 * 启动守护进程（走启动器脚本，后台带 keepalive）。
 */
function startDaemon() {
	const pid = readDaemonPid()
	if (isProcessAlive(pid)) {
		console.log(t('panel.alreadyRunning', { pid }))
		return
	}
	const launcher = launcherPath()
	console.log(t('panel.startingDaemon'))
	try {
		startDaemonViaLauncher(launcher)
	}
	catch (err) {
		console.error(t('panel.startFailed', { error: err.message }))
	}
}

/**
 * 停止守护进程。
 */
function stopDaemon() {
	const pid = readDaemonPid()
	if (!isProcessAlive(pid)) {
		console.log(t('panel.notRunning'))
		return
	}
	console.log(t('panel.stoppingDaemon', { pid }))
	killPid(pid)
	for (let i = 0; i < STOP_POLL_ATTEMPTS; i++) {
		Deno.sleepSync(STOP_POLL_INTERVAL_MS)
		if (!isProcessAlive(pid)) break
	}
	if (isProcessAlive(pid)) console.log(t('panel.stopFailed'))
}

/**
 * 展示守护进程与连接状态。
 */
function showStatus() {
	const pid = readDaemonPid()
	const alive = isProcessAlive(pid)
	const st = readStatus()
	console.log('')
	console.log(t('panel.status.daemon', { state: alive ? t('panel.status.running') : t('panel.status.stopped') }))
	console.log(t('panel.status.pid', { pid: pid ?? '-' }))
	if (st) {
		console.log(t('panel.status.nodeHash', { hash: st.nodeHash || '-' }))
		console.log(t('panel.status.mode', { mode: st.mode === 'host' ? t('panel.status.host') : t('panel.status.infra') }))
		console.log(t('panel.status.connected', { host: st.connectedHost || '-' }))
		console.log(t('panel.status.infrastructure', { value: st.infraRunning ? t('panel.on') : t('panel.off') }))
		console.log(t('panel.status.updated', { time: st.updatedAt || '-' }))
	}
	console.log('')
}

/**
 * 编辑主机连接配置（当前只暴露第一个主机；留空 roomId 即清空主机列表）。
 */
async function editConnection() {
	const current = loadConfig()
	const host = configuredHosts(current)[0]
	const answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'hostRoomId',
			message: t('panel.roomId'),
			default: host?.hostRoomId || '',
		},
		{
			type: 'password',
			name: 'password',
			message: t('panel.password'),
			mask: '*',
			default: host?.password || '',
		},
		{
			type: 'input',
			name: 'hostNodeHash',
			message: t('panel.nodeHash'),
			default: host?.hostNodeHash || '',
		},
	])
	cfg = {
		hostRoomId: answers.hostRoomId?.trim(),
		password: answers.password?.trim(),
		hostNodeHash: answers.hostNodeHash?.trim() || null,
	}
	if (cfg.hostRoomId && cfg.password) addConfiguredHost(cfg)
	else removeConfiguredHost(host?.hostRoomId)
	console.log(t('panel.saved'))
}

/**
 * 切换 infra 开关（无主机会话时是否参与 overlay 转发）。
 */
async function toggleInfra() {
	const current = loadConfig()
	const { enable } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'enable',
			message: t('panel.infraToggle'),
			default: current.infra !== false,
		},
	])
	cfg = { ...current, infra: enable }
	saveConfig(cfg)
	console.log(t('panel.infraSet', { value: enable ? t('panel.on') : t('panel.off') }))
}

/**
 * 等待用户按回车继续。
 */
async function pressEnter() {
	await inquirer.prompt([{ type: 'input', name: 'c', message: t('panel.pressEnter') }])
}

/**
 * 面板主循环。
 */
async function main() {
	console.log('')
	console.log(`== ${t('panel.title')} ==`)
	while (true) {
		const { action } = await inquirer.prompt([
			{
				type: 'list',
				name: 'action',
				message: t('panel.chooseAction'),
				choices: [
					{ name: t('panel.menu.connection'), value: 'connection' },
					{ name: t('panel.menu.infra'), value: 'infra' },
					{ name: t('panel.menu.status'), value: 'status' },
					{ name: t('panel.menu.start'), value: 'start' },
					{ name: t('panel.menu.stop'), value: 'stop' },
					{ name: t('panel.menu.exit'), value: 'exit' },
				],
			},
		])
		switch (action) {
			case 'connection':
				await editConnection()
				await pressEnter()
				break
			case 'infra':
				await toggleInfra()
				await pressEnter()
				break
			case 'status':
				showStatus()
				await pressEnter()
				break
			case 'start':
				startDaemon()
				await pressEnter()
				break
			case 'stop':
				stopDaemon()
				await pressEnter()
				break
			case 'exit':
				process.exit(0)
		}
	}
}

await main()
