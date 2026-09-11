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

/** SIGTERM 未被响应后升级为 SIGKILL 的宽限（毫秒）。 */
const KILL_ESCALATE_MS = 10000

/**
 * 结束进程树（win32 用 `taskkill /T /F`；POSIX 杀进程组并升级 SIGKILL）。
 * POSIX 下命令需以 `detached: true` 启动使其成为进程组组长，`kill(-pid)` 才能覆盖整组。
 * @param {number} pid 进程 PID
 */
export function killProcessTree(pid) {
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
		return
	}

	/**
	 * 向进程组发送信号；非组长时回退到单进程。
	 * @param {Deno.Signal} signal 信号
	 */
	const signalTree = (signal) => {
		try { Deno.kill(-pid, signal) }
		catch { try { Deno.kill(pid, signal) } catch { /* ignore */ } }
	}
	signalTree('SIGTERM')
	setTimeout(() => signalTree('SIGKILL'), KILL_ESCALATE_MS).unref?.()
}
