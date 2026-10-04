import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const PORT = Number(process.env.SUBFOUNT_LOCAL_PORT || 8932)
/** 唯一允许跨源访问本回环端点的网页端来源。 */
const PAGE_ORIGIN = 'https://steve02081504.github.io'

/**
 * 读取请求体并解析 JSON。
 * @param {import('node:http').IncomingMessage} req 请求
 * @returns {Promise<object>} 解析后的请求体
 */
async function readJsonBody(req) {
	let text = ''
	for await (const chunk of req) {
		text += chunk
		if (text.length > 16384) throw new Error('Request too large')
	}
	return JSON.parse(text)
}

/**
 * 抢占回环守护端点；若已被占用，则把本次启动参数转发给持有者后返回 null。
 * @param {object} root0 依赖与选项
 * @param {string[]} root0.args 本次启动的命令行参数
 * @param {(args: string[]) => Promise<void>} root0.onLaunch 收到转发参数时的处理函数
 * @param {() => object} root0.getStatus 回环状态快照
 * @param {(options: object) => Promise<object>} root0.prove 代网页端完成验证
 * @param {number} [root0.port=PORT] 监听端口
 * @returns {Promise<{close: () => Promise<void>}|null>} 端点句柄；已由其它进程持有时为 null
 */
export async function claimLocalService({ args, onLaunch, getStatus, prove, port = PORT }) {
	const tokenDir = process.env.SUBFOUNT_INSTANCE_DIR || path.join(os.homedir(), '.subfount')
	fs.mkdirSync(tokenDir, { recursive: true })
	const tokenFile = path.join(tokenDir, `local-service-${port}.token`)
	const token = crypto.randomBytes(32).toString('hex')

	const server = http.createServer(async (req, res) => {
		const origin = req.headers.origin
		if (origin && origin !== PAGE_ORIGIN) {
			res.statusCode = 403
			res.end()
			return
		}
		if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
		res.setHeader('Vary', 'Origin')
		res.setHeader('Access-Control-Allow-Private-Network', 'true')
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
		res.setHeader('Content-Type', 'application/json')
		res.setHeader('Cache-Control', 'no-store')
		if (req.method === 'OPTIONS') {
			res.statusCode = 204
			res.end()
			return
		}
		try {
			const url = new URL(req.url, 'http://localhost')
			if (req.method === 'GET' && url.pathname === '/api/ping') {
				res.end(JSON.stringify(getStatus()))
				return
			}
			if (req.method === 'POST' && url.pathname === '/api/launch') {
				if (origin || req.headers.authorization !== `Bearer ${token}`) {
					res.statusCode = 403
					res.end()
					return
				}
				const incoming = await readJsonBody(req)
				if (!Array.isArray(incoming.args) || incoming.args.length > 3 || incoming.args.some(value => typeof value !== 'string')) throw new Error('Invalid launch arguments')
				await onLaunch(incoming.args)
				res.end(JSON.stringify({ accepted: true }))
				return
			}
			if ((req.method === 'GET' && url.pathname === '/api/p2p/verification/local') || (req.method === 'POST' && url.pathname === '/api/verify')) {
				const options = req.method === 'GET' ? Object.fromEntries(url.searchParams) : await readJsonBody(req)
				res.end(JSON.stringify(await prove(options)))
				return
			}
			res.statusCode = 404
			res.end('{}')
		}
		catch (error) {
			res.statusCode = 400
			res.end(JSON.stringify({ status: 'failed', reason: error.message }))
		}
	})

	try {
		await new Promise((resolve, reject) => {
			server.once('error', reject)
			server.listen(port, '127.0.0.1', resolve)
		})
	}
	catch (error) {
		if (error.code !== 'EADDRINUSE') throw error
		return await forwardToHolder({ args, port, tokenFile })
	}

	fs.writeFileSync(tokenFile, token, { mode: 0o600 })
	return {
		/**
		 * 停止监听并清理令牌文件（仅在仍由本进程持有时删除）。
		 * @returns {Promise<void>} 关闭完成
		 */
		close: () => new Promise(resolve => server.close(() => {
			try {
				if (fs.readFileSync(tokenFile, 'utf8') === token) fs.unlinkSync(tokenFile)
			}
			catch { /* 令牌文件已被清理 */ }
			resolve()
		})),
	}
}

/**
 * 端口已被占用：等持有者写下令牌，再把本次启动参数转发过去。
 * @param {object} root0 转发所需信息
 * @param {string[]} root0.args 本次启动的命令行参数
 * @param {number} root0.port 监听端口
 * @param {string} root0.tokenFile 令牌文件路径
 * @returns {Promise<null>} 始终为 null（本次启动不持有端点）
 */
async function forwardToHolder({ args, port, tokenFile }) {
	let holderToken
	for (let attempt = 0; attempt < 50; attempt++) {
		try {
			holderToken = fs.readFileSync(tokenFile, 'utf8').trim()
			break
		}
		catch {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
	}
	if (!holderToken) throw new Error('Existing subfount has no launch token')
	const response = await fetch(`http://127.0.0.1:${port}/api/launch`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${holderToken}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ args }),
		signal: AbortSignal.timeout(15000),
	})
	if (!response.ok) throw new Error('Existing subfount refused launch command')
	return null
}
