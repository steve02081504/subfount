/**
 * AGENTS.md 与引用闭包 `.md`：英文、可解析链接；非 AGENTS.md 须在 docs/ 下。
 * `docs/design/`、`docs/review/`、`docs/issues/`、`docs/readme/` 可为中文。
 */
/* global Deno */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
	CJK_RE,
	isAgentsAuxDocPlacementOk,
	isAgentsMdBasename,
	isHumanFacingDocsPath,
	localMdLinkTargets,
	resolveMdLink,
	scanAgentsMdEnglish,
} from '../src/scripts/checks/agents_md_english.mjs'
import { REPO_ROOT } from '../src/scripts/checks/repo_root.mjs'

/**
 * 将 scan 问题格式化为断言可读字符串。
 * @param {{ path: string, lines: number[], missing?: boolean, placement?: boolean, from?: string }} issue 问题
 * @returns {string} 一行摘要
 */
function formatIssue(issue) {
	if (issue.missing) return `missing ${issue.path}${issue.from ? ` <- ${issue.from}` : ''}`
	if (issue.placement) return `placement ${issue.path}`
	return `${issue.path}:${issue.lines.join(',')}`
}

Deno.test('resolveMdLink handles repo-root and relative links', () => {
	assert.equal(resolveMdLink('AGENTS.md', 'docs/AGENTS.md'), 'docs/AGENTS.md')
	assert.equal(
		resolveMdLink('src/scripts/test/docs/domain-harness.md', '../../p2p/docs/signaling.md'),
		'src/scripts/p2p/docs/signaling.md',
	)
	assert.equal(resolveMdLink('docs/AGENTS.md', 'https://example.com/x.md'), null)
	assert.equal(resolveMdLink('docs/AGENTS.md', 'mailto:a@b.com/x.md'), null)
	assert.equal(resolveMdLink('docs/AGENTS.md', '//cdn.example/x.md'), null)
})

Deno.test('localMdLinkTargets parses bare, angle-bracket, titled, and fragment forms', () => {
	assert.deepEqual(localMdLinkTargets('see [a](docs/a.md) and [b](docs/b.md#sec)'), [
		'docs/a.md',
		'docs/b.md',
	])
	assert.deepEqual(localMdLinkTargets('see [a](<docs/a.md>) and [b](<docs/b.md#sec>)'), [
		'docs/a.md',
		'docs/b.md',
	])
	assert.deepEqual(localMdLinkTargets('see [a](docs/a.md "Title") and [b](<docs/b.md#x> \'Alt\')'), [
		'docs/a.md',
		'docs/b.md',
	])
	assert.deepEqual(localMdLinkTargets('skip [ext](https://example.com/x.md)'), [])
})

Deno.test('isAgentsAuxDocPlacementOk / isAgentsMdBasename', () => {
	assert.equal(isAgentsMdBasename('AGENTS.md'), true)
	assert.equal(isAgentsMdBasename('src/foo/agents.md'), true)
	assert.equal(isAgentsMdBasename('docs/notes.md'), false)
	assert.equal(isAgentsAuxDocPlacementOk('AGENTS.md'), true)
	assert.equal(isAgentsAuxDocPlacementOk('path/docs/git-notes.md'), true)
	assert.equal(isAgentsAuxDocPlacementOk('docs/design/spec.md'), true)
	assert.equal(isAgentsAuxDocPlacementOk('imgs/icon_anime/physics-notes.md'), false)
})

Deno.test('angle-bracket and titled .md links are discovered and scanned recursively', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'agents-md-links-'))
	try {
		await writeFile(join(directory, 'AGENTS.md'), [
			'# Root',
			'',
			'See [angled](<nested/docs/guide.md#top>) and [titled](nested/docs/other.md "Other") and [bad](nested/loose.md).',
			'',
		].join('\n'), 'utf8')
		await mkdir(join(directory, 'nested', 'docs'), { recursive: true })
		await writeFile(join(directory, 'nested', 'docs', 'guide.md'), [
			'# Guide',
			'',
			'See [leaf](leaf.md).',
			'中文说明',
			'',
		].join('\n'), 'utf8')
		await writeFile(join(directory, 'nested', 'docs', 'other.md'), [
			'# Other',
			'',
			'See [missing](gone.md).',
			'',
		].join('\n'), 'utf8')
		await writeFile(join(directory, 'nested', 'docs', 'leaf.md'), '# Leaf\n', 'utf8')
		await writeFile(join(directory, 'nested', 'loose.md'), '# Loose\n', 'utf8')

		const { files, issues } = await scanAgentsMdEnglish(directory)
		assert.deepEqual(issues.map(formatIssue).sort(), [
			'missing nested/docs/gone.md <- nested/docs/other.md',
			'nested/docs/guide.md:4',
			'placement nested/loose.md',
		].sort())
		assert.deepEqual(files, [
			'AGENTS.md',
			'nested/docs/guide.md',
			'nested/docs/leaf.md',
			'nested/docs/other.md',
			'nested/loose.md',
		].sort())
	}
	finally {
		await rm(directory, { recursive: true, force: true })
	}
})

Deno.test('isHumanFacingDocsPath', () => {
	assert.equal(isHumanFacingDocsPath('docs/design/emoji-pack-spec.md'), true)
	assert.equal(isHumanFacingDocsPath('docs/review/foo.md'), true)
	assert.equal(isHumanFacingDocsPath('docs/issues/part-hot-reload.md'), true)
	assert.equal(isHumanFacingDocsPath('docs/readme/Readme.zh-CN.md'), true)
	assert.equal(isHumanFacingDocsPath('docs/AGENTS.md'), false)
	assert.equal(isHumanFacingDocsPath('src/scripts/test/AGENTS.md'), false)
})

Deno.test('CJK_RE matches CJK scripts', () => {
	assert.ok(CJK_RE.test('中文'))
	assert.ok(CJK_RE.test('ひらがな'))
	assert.ok(CJK_RE.test('カタカナ'))
	assert.ok(CJK_RE.test('한글'))
	assert.equal(CJK_RE.test('English … — ok'), false)
})

Deno.test('AGENTS.md closure: English, resolvable links, aux docs under docs/', async () => {
	const { issues } = await scanAgentsMdEnglish(REPO_ROOT)
	assert.deepEqual(
		issues.map(formatIssue),
		[],
		issues.map(formatIssue).join('\n'),
	)
})
