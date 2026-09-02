import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const defaultDataDir = path.join(rootDir, 'data')

/**
 * 确保数据目录存在，不存在则创建。
 */
function ensureDataDir() {
	fs.mkdirSync(getDataDir(), { recursive: true })
}

/**
 * 返回仓库根目录。
 * @returns {string} 仓库根目录绝对路径
 */
export function getRootDir() {
	return rootDir
}

/**
 * 返回数据目录（可用 SUBF_DATA_DIR 环境变量覆盖，便于测试隔离）。
 * @returns {string} 数据目录绝对路径
 */
export function getDataDir() {
	return process.env.SUBF_DATA_DIR || defaultDataDir
}

/**
 * 默认配置项。
 */
export const DEFAULT_CONFIG = {
	hostRoomId: null,
	password: null,
	hostNodeHash: null,
	infra: true,
}

/**
 * 读取配置，合并默认值；文件缺失或损坏时回退到默认配置。
 * @returns {object} 合并后的配置对象
 */
export function loadConfig() {
	ensureDataDir()
	const file = path.join(getDataDir(), 'config.json')
	try {
		return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf-8')) }
	}
	catch {
		return { ...DEFAULT_CONFIG }
	}
}

/**
 * 保存配置到 data/config.json。
 * @param {object} cfg 要保存的配置对象
 */
export function saveConfig(cfg) {
	ensureDataDir()
	fs.writeFileSync(path.join(getDataDir(), 'config.json'), JSON.stringify(cfg, null, '\t') + '\n')
}

/**
 * 确保配置文件存在，不存在则写入默认配置。
 */
export function ensureConfigFile() {
	ensureDataDir()
	const file = path.join(getDataDir(), 'config.json')
	if (!fs.existsSync(file)) saveConfig({ ...DEFAULT_CONFIG })
}

/**
 * 写入守护进程 PID 文件。
 * @param {number} pid 守护进程 PID
 */
export function writeDaemonPid(pid = process.pid) {
	ensureDataDir()
	fs.writeFileSync(path.join(getDataDir(), 'daemon.pid'), String(pid))
}

/**
 * 删除守护进程 PID 文件。
 */
export function clearDaemonPid() {
	try { fs.unlinkSync(path.join(getDataDir(), 'daemon.pid')) } catch { /* ignore */ }
}

/**
 * 读取守护进程 PID。
 * @returns {number|null} 守护进程 PID；文件不存在或解析失败时返回 null
 */
export function readDaemonPid() {
	try { return Number(fs.readFileSync(path.join(getDataDir(), 'daemon.pid'), 'utf-8')) } catch { return null }
}

/**
 * 原子写入状态文件。
 * @param {object} status 要写入的状态对象
 */
export function writeStatus(status) {
	ensureDataDir()
	const file = path.join(getDataDir(), 'status.json')
	const tmp = file + '.tmp'
	try {
		fs.writeFileSync(tmp, JSON.stringify(status, null, '\t') + '\n')
		fs.renameSync(tmp, file)
	}
	catch { /* ignore */ }
}

/**
 * 读取状态文件。
 * @returns {object|null} 状态对象；文件不存在或解析失败时返回 null
 */
export function readStatus() {
	try { return JSON.parse(fs.readFileSync(path.join(getDataDir(), 'status.json'), 'utf-8')) } catch { return null }
}
