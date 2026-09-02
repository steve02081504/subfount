#!/usr/bin/env node
/**
 * 维护工具：将唯一的 POSIX 包管理器函数族同步进全部消费文件。
 *
 * 事实源：`path/subfount` 中 `# BEGIN/END SUBF_PKG_MGR` 之间的**可读** bash 代码块
 * （`path/subfount` 经 `run.sh` 用 `/bin/sh` 运行，故必须保持 POSIX）。
 * 消费端（全部注入压缩后的单行内容）：
 * - `README.md` 与 `docs/Readme.*.md`（原样压缩，供任意 shell 复制粘贴）。
 *
 * `src/runner/main.sh` 是 bash 脚本，不在同步范围——它有自己独立的 bash 版包管理。
 *
 * 用法：`deno run --allow-all tools/sync-pkg-mgr.mjs` 或 `node tools/sync-pkg-mgr.mjs`。
 * 测试会校验各消费端与 `path/subfount` 的压缩结果一致；不一致时运行本脚本即可。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
export const SH_BEGIN = '# BEGIN SUBF_PKG_MGR'
export const SH_END = '# END SUBF_PKG_MGR'

const blockRe = () => new RegExp(`${SH_BEGIN}\\n([\\s\\S]*?)\\n?${SH_END}\\n?`, 'g')

export const readmeTargets = () => {
	const dir = join(root, 'docs')
	const names = readdirSync(dir).filter(name => name.startsWith('Readme.') && name.endsWith('.md')).sort()
	return ['README.md', ...names.map(name => `docs/${name}`)]
}

export function canonicalSource() {
	const subfount = readFileSync(join(root, 'path/subfount'), 'utf8')
	const m = blockRe().exec(subfount)
	if (!m)
		throw new Error('canonical markers missing in path/subfount')
	return `${m[1].trimEnd()}\n`
}

export function canonicalCode() {
	return `${minify(canonicalSource()).trimEnd()}\n`
}

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

export function injectBlock(content, block) {
	if (content.includes(SH_BEGIN))
		return content.replace(blockRe(), () => block)
	const migrated = content.replace(/^install_package\(\) \{.*\n/gm, `${block}`)
	if (migrated === content)
		throw new Error('no SUBF_PKG_MGR markers or legacy install_package definition found')
	return migrated
}

export function syncPkgMgr() {
	const canonical = canonicalCode()
	for (const readme of readmeTargets()) {
		const path = join(root, readme)
		const src = readFileSync(path, 'utf8')
		writeFileSync(path, injectBlock(src, `${SH_BEGIN}\n${canonical}${SH_END}\n`))
	}
}

if (import.meta.main)
	syncPkgMgr()
