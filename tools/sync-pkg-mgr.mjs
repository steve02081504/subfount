#!/usr/bin/env node
/**
 * 维护工具：把 **fount** 的 POSIX 包管理器函数族同步进 subfount 的全部消费文件。
 *
 * 事实源：本机 fount（同级目录 `../fount`）的 `path/fount` 中 `# BEGIN/END FOUNT_PKG_MGR`
 * 之间的**可读** bash 代码块（本机有 fount 安装/仓库时优先，从其同步覆盖 subfount 自己的内容）。
 * 本机无 fount 时回退到 `path/subfount` 中已嵌入的 FOUNT_PKG_MGR 块。
 * 消费端（全部注入压缩后的单行内容）：
 * - `path/subfount`（POSIX 启动器；块体本身经 `/bin/sh` 运行，必须保持 POSIX）；
 * - `README.md` 与 `docs/Readme.*.md`（原样压缩，供任意 shell 复制粘贴）。
 *
 * `src/runner/main.sh` 是 bash 脚本，不在同步范围——它有自己独立的 bash 版包管理。
 *
 * 用法：`deno run --allow-all tools/sync-pkg-mgr.mjs` 或 `node tools/sync-pkg-mgr.mjs`。
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
export const SH_BEGIN = '# BEGIN FOUNT_PKG_MGR'
export const SH_END = '# END FOUNT_PKG_MGR'

/**
 * 匹配 FOUNT_PKG_MGR 标记块的全局正则。
 * @returns {RegExp} 标记块匹配器。
 */
const blockRe = () => new RegExp(`${SH_BEGIN}\\n([\\s\\S]*?)\\n?${SH_END}\\n?`, 'g')

/**
 * 本地 fount 仓库/安装的 `path/fount` 路径；无则返回空串。
 * @returns {string} 事实源路径（存在才返回）。
 */
export function fountSourcePath() {
	const candidates = [
		join(root, '../fount/path/fount'),
	]
	return candidates.find(existsSync) ?? ''
}

/**
 * 读取事实源代码块（本机 fount 优先，回退 path/subfount 内嵌块）。
 * @returns {string} 可读规范原文（末尾带单个换行）。
 */
export function canonicalSource() {
	const source = fountSourcePath()
	if (source) {
		const m = blockRe().exec(readFileSync(source, 'utf8'))
		if (m)
			return `${m[1].trimEnd()}\n`
	}
	const m = blockRe().exec(readFileSync(join(root, 'path/subfount'), 'utf8'))
	if (!m)
		throw new Error('FOUNT_PKG_MGR markers missing in path/subfount and no local fount repo found')
	return `${m[1].trimEnd()}\n`
}

/**
 * 规范压缩字节：把事实源压缩为单行，所有消费端以它为准。
 * @returns {string} 单行压缩规范（末尾带单个换行）。
 */
export function canonicalCode() {
	return `${minify(canonicalSource()).trimEnd()}\n`
}

/**
 * 压缩为单行：去掉整行注释与空行，按语句边界以 `; ` 连接。
 * `{`/`do`/`then`/`else`/`in`/`;;` 以及 case 模式 `)` 之后不能直接跟 `;`，改用空格。
 * @param {string} code 规范原文。
 * @returns {string} 单行压缩版。
 */
export function minify(code) {
	const noSepAfter = new Set(['{', 'do', 'then', 'else', 'in', ';;'])
	const lines = code
		.split('\n')
		.map(line => line.replace(/^\s+|\s+$/g, ''))
		.filter(line => line && !line.startsWith('#'))
	let out = ''
	for (let i = 0; i < lines.length; i++) {
		out += lines[i]
		if (i === lines.length - 1) break
		const lastToken = lines[i].split(/\s+/).pop()
		const casePattern = lastToken.endsWith(')') && !lines[i].includes('$(')
		out += noSepAfter.has(lastToken) || casePattern ? ' ' : '; '
	}
	return out
}

/**
 * 仓库内所有包含安装代码块的 readme。
 * @returns {string[]} 相对仓库根的路径。
 */
export const readmeTargets = () => {
	const dir = join(root, 'docs')
	const names = readdirSync(dir).filter(name => name.startsWith('Readme.') && name.endsWith('.md')).sort()
	return ['README.md', ...names.map(name => `docs/${name}`)]
}

/**
 * 把目标文件里的 FOUNT_PKG_MGR 标记块（全部）替换为指定块；无标记则报错。
 * @param {string} content 目标文件原文。
 * @param {string} block 替换后的标记块。
 * @returns {string} 替换后的内容。
 */
export function injectBlock(content, block) {
	if (content.includes(SH_BEGIN))
		return content.replace(blockRe(), () => block)
	throw new Error('no FOUNT_PKG_MGR markers found')
}

/**
 * 执行同步：把规范压缩字节写入全部消费端。
 * @returns {void}
 */
export function syncPkgMgr() {
	const canonical = canonicalCode()
	const block = `${SH_BEGIN}\n${canonical}${SH_END}\n`
	for (const target of ['path/subfount', ...readmeTargets()]) {
		const path = join(root, target)
		const src = readFileSync(path, 'utf8')
		writeFileSync(path, injectBlock(src, block))
	}
}

if (import.meta.main)
	syncPkgMgr()
