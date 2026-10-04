/**
 * 仓库文件遍历（默认走 git ls-files；尊重嵌套 gitignore，含未忽略未跟踪文件）。
 */
import { execFile } from 'npm:@steve02081504/exec'

/**
 * 路径是否匹配后缀列表；空列表表示不过滤。
 * @param {string} relativePath 相对路径
 * @param {string[] | null | undefined} suffixes 后缀；空/缺省=全部
 * @returns {boolean} 是否保留
 */
function matchesSuffixes(relativePath, suffixes) {
	if (!suffixes?.length) return true
	return suffixes.some(suffix => relativePath.endsWith(suffix))
}

/**
 * 经 git 列出工作区文件（已跟踪 + 未忽略未跟踪；尊重嵌套 gitignore）。
 * @param {string} repoRoot 仓库根
 * @param {string} [under=''] 相对子目录
 * @returns {Promise<string[]>} 相对路径（正斜杠）
 */
async function listViaGit(repoRoot, under = '') {
	const scope = under ? ['--', under] : []
	const [tracked, deleted, untracked] = await Promise.all([
		execFile('git', ['ls-files', '-z', ...scope], { cwd: repoRoot }),
		execFile('git', ['ls-files', '-z', '--deleted', ...scope], { cwd: repoRoot }),
		execFile('git', ['ls-files', '-z', '--others', '--exclude-standard', ...scope], { cwd: repoRoot }),
	])
	if (tracked.code !== 0)
		throw new Error(tracked.stderr || `git ls-files failed (${tracked.code})`)
	if (deleted.code !== 0)
		throw new Error(deleted.stderr || `git ls-files --deleted failed (${deleted.code})`)
	if (untracked.code !== 0)
		throw new Error(untracked.stderr || `git ls-files --others failed (${untracked.code})`)
	const deletedSet = new Set(String(deleted.stdout).split('\0').map(path => path.trim()).filter(Boolean))
	/** @type {string[]} */
	const files = []
	for (const chunk of [tracked.stdout, untracked.stdout]) {
		if (!chunk) continue
		for (const path of String(chunk).split('\0')) {
			const normalized = path.trim().replaceAll('\\', '/')
			if (normalized && !deletedSet.has(path.trim())) files.push(normalized)
		}
	}
	return [...new Set(files)]
}

/**
 * 递归收集匹配后缀的文件（相对仓库根、正斜杠）。
 * @param {string} repoRoot 仓库根
 * @param {string[] | null | undefined} [suffixes] 后缀（如 `.html`）；空/缺省=全部
 * @param {object} [options] 选项
 * @param {string} [options.under=''] 相对仓库根的子目录（空=整仓）
 * @returns {Promise<string[]>} 相对路径列表（已排序）
 */
export async function listRepoFiles(repoRoot, suffixes, options = {}) {
	const under = options.under ? options.under.replaceAll('\\', '/').replace(/\/$/u, '') : ''
	const files = await listViaGit(repoRoot, under)
	return files.filter(path => matchesSuffixes(path, suffixes)).sort()
}
