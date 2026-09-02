/* global Deno */

import process from 'node:process'

/**
 * 检查进程是否存活。
 * @param {number} pid 进程 PID
 * @returns {boolean} 进程存活返回 true，否则返回 false
 */
export function isProcessAlive(pid) {
	if (!pid || !Number.isInteger(pid) || pid <= 0) return false
	if (process.platform !== 'win32') {
		try { process.kill(pid, 0); return true }
		catch (err) { return err?.code === 'EPERM' }
	}
	try {
		const out = new Deno.Command('tasklist', {
			args: ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
			stdout: 'piped',
			stderr: 'null',
		}).outputSync()
		return new TextDecoder().decode(out.stdout).includes(String(pid))
	}
	catch { return false }
}

/**
 * 强制结束进程（win32 用 taskkill /T /F，其余平台发送 SIGTERM）。
 * @param {number} pid 进程 PID
 */
export function killPid(pid) {
	if (!pid) return
	if (process.platform === 'win32') {
		try {
			new Deno.Command('taskkill', {
				args: ['/PID', String(pid), '/T', '/F'],
				stdout: 'null',
				stderr: 'null',
			}).outputSync()
		}
		catch { /* ignore */ }
	}
	else
		try { Deno.kill(pid, 'SIGTERM') } catch { /* ignore */ }
}
