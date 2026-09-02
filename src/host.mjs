import { setInterval, clearInterval, setTimeout } from 'node:timers'

/**
 * 信誉表拉取间隔（毫秒）。
 */
export const REPUTATION_PULL_INTERVAL_MS = 15 * 60 * 1000
/**
 * 设备信息上报间隔（毫秒）。
 */
export const DEVICE_INFO_INTERVAL_MS = 15 * 60 * 1000

/**
 * 读取 infra 策略（默认启用）。
 * @param {object} data 主机下发数据
 * @returns {boolean} infra 是否启用
 */
export function readInfraPolicy(data) {
	return data?.infra !== false
}

/**
 * 创建主机辅助对象（信誉拉取 / infra 优先级管理）。
 * @param {object} p2p fount-p2p 模块实例
 * @returns {object} 主机辅助对象
 */
export function createHostAssist(p2p) {
	let hostNodeHash = null
	let infraEnabled = true
	let reputationPullInterval = null

	/**
	 * 从主机拉取信誉表并应用。
	 */
	async function pullHostReputation() {
		if (!hostNodeHash) return
		try {
			const table = await Promise.race([
				p2p.pullReputationFromNode(hostNodeHash),
				new Promise((_, reject) => setTimeout(() => reject(new Error('reputation pull timed out')), 10_000)),
			])
			await p2p.setReputationTable(table)
			console.log('✓ Pulled reputation table from host')
		}
		catch (error) {
			console.warn('Reputation pull failed:', error.message)
		}
	}

	/**
	 * 清除主机优先帮扶状态。
	 */
	async function clearHostPriority() {
		if (reputationPullInterval) {
			clearInterval(reputationPullInterval)
			reputationPullInterval = null
		}
		const locked = hostNodeHash || p2p.getReputationLocks()[0]
		if (locked) await p2p.unlockReputationMax([locked])
		p2p.setTrustSyncDonors([])
		p2p.setInfraPriority({ useLocalReputation: false })
	}

	/**
	 * 启用对指定主机的优先帮扶。
	 * @param {string} nodeHash 主机节点哈希
	 */
	async function enableHostAssist(nodeHash) {
		hostNodeHash = nodeHash
		if (!infraEnabled) return
		p2p.setTrustSyncDonors([nodeHash])
		await p2p.lockReputationMax([nodeHash])
		p2p.setInfraPriority({ useLocalReputation: true })
		await pullHostReputation()
		if (reputationPullInterval) clearInterval(reputationPullInterval)
		reputationPullInterval = setInterval(() => {
			void pullHostReputation()
		}, REPUTATION_PULL_INTERVAL_MS).unref()
	}

	/**
	 * 根据主机策略应用 infra 启停与主机优先帮扶。
	 * @param {boolean} enabled 是否启用 infra
	 * @param {boolean} authenticated 是否已通过主机认证
	 */
	async function applyInfra(enabled, authenticated) {
		infraEnabled = Boolean(enabled)
		if (infraEnabled) {
			if (!p2p.isInfraRunning()) await p2p.startInfra({ logger: console })
			if (authenticated && hostNodeHash) await enableHostAssist(hostNodeHash)
			console.log(authenticated
				? '✓ Infra enabled (host priority assist)'
				: '✓ Infra enabled')
			return
		}
		await clearHostPriority()
		if (p2p.isInfraRunning()) await p2p.stopInfra()
		console.log('✓ Infra disabled by host policy')
	}

	/**
	 * 主机断开时的清理与默认 infra 恢复。
	 */
	async function onHostDisconnected() {
		await clearHostPriority()
		hostNodeHash = null
		infraEnabled = true
		if (!p2p.isInfraRunning()) await p2p.startInfra({ logger: console })
	}

	return {
		/**
		 * 当前主机节点哈希。
		 * @returns {string|null} 主机节点哈希，未设置时为 null
		 */
		get hostNodeHash() { return hostNodeHash },
		/**
		 * 设置主机节点哈希。
		 * @param {string|null} value 主机节点哈希
		 */
		set hostNodeHash(value) { hostNodeHash = value },
		applyInfra,
		onHostDisconnected,
	}
}
