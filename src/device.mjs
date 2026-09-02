import os from 'node:os'
import process from 'node:process'

/**
 * 安全地执行采集函数，出错时记录日志并返回错误信息。
 * @param {string} name 采集项名称
 * @param {Function} fn 执行采集的异步函数
 * @returns {Promise<*>} 采集结果；出错时为包含 error 字段的对象
 */
export async function safeCollect(name, fn) {
	try {
		return await fn()
	}
	catch (error) {
		console.error(`Error collecting ${name} info:`, error)
		return { error: error.message }
	}
}

/**
 * 基于机器信息生成稳定的设备 ID。
 * @returns {Promise<string>} 32 位十六进制设备 ID
 */
export async function generateDeviceId() {
	try {
		const machineInfo = {
			hostname: os.hostname(),
			platform: process.platform,
			arch: os.arch(),
			type: os.type(),
			release: os.release(),
		}
		try {
			const networkInterfaces = os.networkInterfaces()
			for (const interfaceName in networkInterfaces) {
				const interfaces = networkInterfaces[interfaceName]
				if (interfaces)
					for (const iface of interfaces)
						if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
							machineInfo.mac = iface.mac
							break
						}
				if (machineInfo.mac) break
			}
		}
		catch (error) {
			console.warn('Failed to get MAC address:', error.message)
		}
		try {
			const cpus = os.cpus()
			if (cpus?.length > 0) machineInfo.cpuModel = cpus[0].model
		}
		catch { /* ignore */ }
		const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(machineInfo)))
		return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
	}
	catch (error) {
		console.error('Failed to generate machine ID, falling back to hostname:', error)
		return os.hostname().replace(/[^\dA-Za-z]/g, '').substring(0, 32) || 'subfount-client'
	}
}

/**
 * 采集设备信息（CPU、内存、磁盘、shell 可用性等）。
 * @returns {Promise<object>} 设备信息对象
 */
export async function collectDeviceInfo() {
	const info = {
		hostname: os.hostname(),
		os: { type: os.type(), release: os.release(), arch: os.arch(), platform: process.platform },
		timestamp: new Date().toISOString(),
	}

	info.cpu = await safeCollect('CPU', async () => {
		const osinfo = (await import('npm:node-os-utils')).createOSUtils()
		const [{ data: cpuInfo }, { data: usage }] = await Promise.all([
			osinfo.cpu.info(),
			osinfo.cpu.usage(),
		])
		return {
			model: cpuInfo.model.replaceAll('\x00', ''),
			cores: cpuInfo.threads,
			frequency: cpuInfo.baseFrequency,
			usage,
		}
	})

	info.memory = await safeCollect('memory', async () => {
		const osinfo = (await import('npm:node-os-utils')).createOSUtils()
		const { data: memInfo } = await osinfo.memory.info()
		return {
			total: memInfo.total.toMB(),
			used: memInfo.used.toMB(),
			free: memInfo.free.toMB(),
			usage: memInfo.usagePercentage,
		}
	})

	info.disk = await safeCollect('disk', async () => {
		const osinfo = (await import('npm:node-os-utils')).createOSUtils()
		const { data: disks } = await osinfo.disk.info()
		const diskUsage = {}
		for (const disk of disks)
			diskUsage[disk.mountpoint] = {
				total: disk.total.toGB(),
				free: disk.available.toGB(),
				used: disk.used.toGB(),
				usage: disk.usagePercentage,
			}
		return diskUsage
	})

	info.shells = await safeCollect('shell availability', async () => {
		const { available } = await import('npm:@steve02081504/exec')
		return available
	})

	return info
}
