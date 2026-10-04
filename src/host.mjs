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
 * 创建单个主机的优先帮扶对象：拉取其信誉表，并声明本机愿为它转发的信誉 donor。
 * @param {object} ipc 网络层接口（`createHostPool` 提供的按会话分发代理）
 * @returns {object} 主机帮扶对象
 */
export function createHostAssist(ipc) {
	let hostNodeHash = null
	let reputationPullInterval = null

	/**
	 * 从主机拉取信誉表并应用。
	 */
	async function pullHostReputation() {
		if (!hostNodeHash) return
		try {
			const table = await Promise.race([
				ipc.pullReputationFromNode(hostNodeHash),
				new Promise((_, reject) => setTimeout(() => reject(new Error('reputation pull timed out')), 10_000)),
			])
			await ipc.setReputationTable(table)
			console.log('✓ Pulled reputation table from host')
		}
		catch (error) {
			console.warn('Reputation pull failed:', error.message)
		}
	}

	/**
	 * 清除主机优先帮扶状态：停拉取、解锁信誉、撤销 donor 声明。
	 */
	async function clearHostPriority() {
		clearInterval(reputationPullInterval)
		reputationPullInterval = null
		if (hostNodeHash) await ipc.unlockReputationMax([hostNodeHash])
		ipc.setTrustSyncDonors([])
	}

	/**
	 * 启用对指定主机的优先帮扶。
	 * @param {string} nodeHash 主机节点哈希
	 */
	async function enableHostAssist(nodeHash) {
		hostNodeHash = nodeHash
		ipc.setTrustSyncDonors([nodeHash])
		await ipc.lockReputationMax([nodeHash])
		await pullHostReputation()
		reputationPullInterval = setInterval(() => {
			void pullHostReputation()
		}, REPUTATION_PULL_INTERVAL_MS).unref()
	}

	/**
	 * 应用主机下发的 infra 策略：启用时优先帮扶该主机，禁用时撤销帮扶。
	 * @param {boolean} enabled 是否启用 infra
	 * @param {boolean} authenticated 是否已通过主机认证
	 */
	async function applyInfra(enabled, authenticated) {
		if (!enabled) {
			await clearHostPriority()
			return
		}
		if (authenticated && hostNodeHash) await enableHostAssist(hostNodeHash)
	}

	/**
	 * 主机断开：撤销帮扶（未认证过则什么都不做）。
	 */
	async function revokeHost() {
		await clearHostPriority()
		hostNodeHash = null
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
		revokeHost,
	}
}

/**
 * 汇总所有主机会话的 infra 策略：只要有一个主机要 infra 就保持运行，没有主机会话时用 `defaultInfra`。
 *
 * 每个会话拿到的 `ipc` 代理只记录自己的意图，真实启停、信誉锁与 donor 列表由这里统一发布，
 * 因此单个主机掐不掉另一个主机的 infra，注销的会话也不会留下孤立的信誉锁。
 * @param {object} p2p fount-p2p 模块
 * @returns {object} 主机会话池（`defaultInfra` 供内核按本地配置调整）
 */
export function createHostPool(p2p) {
	const sessions = new Map()
	let tail = Promise.resolve()

	/**
	 * 把汇总后的策略发布到网络层；串行执行，避免启停与锁定互相穿插。
	 * @returns {Promise<void>} 发布完成
	 */
	function publish() {
		tail = tail.then(async () => {
			const active = [...sessions.values()].filter(session => session.infraEnabled)
			const donors = [...new Set(active.flatMap(session => session.donors))]
			const locks = [...new Set(active.flatMap(session => session.locks))]
			const stale = p2p.getReputationLocks().filter(hash => !locks.includes(hash))
			if (stale.length) await p2p.unlockReputationMax(stale)
			if (locks.length) await p2p.lockReputationMax(locks)
			p2p.setTrustSyncDonors(donors)
			p2p.setInfraPriority({ useLocalReputation: donors.length > 0 })
			const wanted = sessions.size ? active.length > 0 : pool.defaultInfra
			if (wanted) {
				if (!p2p.isInfraRunning()) await p2p.startInfra({ logger: console })
			}
			else if (p2p.isInfraRunning()) await p2p.stopInfra()
		})
		return tail
	}

	/**
	 * 登记一个新主机会话，返回只影响它自己的帮扶对象。
	 * @returns {object} 主机帮扶对象（额外带 close）
	 */
	function create() {
		const session = { infraEnabled: pool.defaultInfra, donors: [], locks: [] }
		sessions.set(session, session)

		const assist = createHostAssist({
			...p2p,
			setTrustSyncDonors: donors => { session.donors = donors; void publish() },
			lockReputationMax: locks => { session.locks = [...new Set([...session.locks, ...locks])]; void publish() },
			unlockReputationMax: locks => { session.locks = session.locks.filter(hash => !locks.includes(hash)); void publish() },
			setInfraPriority: () => { },
		})
		const applyInfra = assist.applyInfra
		/**
		 * 应用主机策略并同步汇总状态。
		 * @param {boolean} enabled 是否启用 infra
		 * @param {boolean} authenticated 是否已通过主机认证
		 * @returns {Promise<void>} 应用完成
		 */
		assist.applyInfra = async (enabled, authenticated) => {
			session.infraEnabled = Boolean(enabled)
			await applyInfra(enabled, authenticated)
			if (!enabled) await publish()
		}
		const revokeHost = assist.revokeHost
		/**
		 * 注销本会话：撤销帮扶并把它的 intent 恢复到池默认。
		 * @returns {Promise<void>} 注销完成
		 */
		assist.revokeHost = async () => {
			await revokeHost()
			session.infraEnabled = pool.defaultInfra
			session.donors = []
			session.locks = []
			await publish()
		}
		/**
		 * 关闭会话并把它从汇总策略中移除。
		 * @returns {Promise<void>} 关闭完成
		 */
		assist.close = async () => {
			await assist.revokeHost()
			sessions.delete(session)
			await publish()
		}
		void publish()
		return assist
	}

	const pool = {
		defaultInfra: true,
		create,
		/**
		 * 等待已排队的策略发布完成（停机与测试用）。
		 * @returns {Promise<void>} 发布完成
		 */
		settled: () => tail,
	}
	return pool
}
