/**
 * JSDoc 禁用纯英文摘要 / 缺摘要的扫描器自测；仓库源码不应残留英文摘要或空摘要。
 */
/* global Deno */
import assert from 'node:assert/strict'

import {
	extractJsdocBlocks,
	hasInlineJsdocClosing,
	hasInlineJsdocOpening,
	isEnglishJsdocSummary,
	isTagOnlyJsdoc,
	jsdocSummaryLines,
	scanFileJsdocClosing,
	scanFileJsdocNoEnglish,
	scanFileJsdocOpening,
	scanJsdocClosing,
	scanJsdocNoEnglish,
	scanJsdocOpening,
} from '../src/scripts/checks/jsdoc_no_english.mjs'
import { REPO_ROOT } from '../src/scripts/checks/repo_root.mjs'

Deno.test('jsdocSummaryLines: stops at first @tag', () => {
	const block = `/**
 * 中文摘要行。
 * 第二行。
 * @param {number} x column
 * @returns {void}
 */`
	assert.deepEqual(jsdocSummaryLines(block), ['中文摘要行。', '第二行。'])
})

Deno.test('isEnglishJsdocSummary: CJK is not English', () => {
	assert.equal(isEnglishJsdocSummary(['中文摘要']), false)
	assert.equal(isEnglishJsdocSummary(['English only']), true)
	assert.equal(isEnglishJsdocSummary([]), false)
})

Deno.test('isTagOnlyJsdoc: empty stub is not tag-only', () => {
	assert.equal(isTagOnlyJsdoc('/** */'), false)
	assert.equal(isTagOnlyJsdoc('/**\n *\n */'), false)
	assert.equal(isTagOnlyJsdoc('/**\n * @typedef {{ x: number }}\n */'), true)
	assert.equal(isTagOnlyJsdoc('/**\n * @typedef {object} Foo\n * @property {number} x\n */'), true)
	assert.equal(isTagOnlyJsdoc('/**\n * @param {number} x\n * @returns {void}\n */'), true)
})

Deno.test('extractJsdocBlocks: line numbers', () => {
	const blocks = extractJsdocBlocks('/** 甲 */\nconst x = 1\n/** 乙 */')
	assert.equal(blocks.length, 2)
	assert.equal(blocks[0].startLine, 1)
	assert.equal(blocks[1].startLine, 3)
})

Deno.test('extractJsdocBlocks: ignores JSDoc text inside template literals', () => {
	const blocks = extractJsdocBlocks('const s = `\n/** English doc */\n`\n/** 中文摘要 */\n')
	assert.equal(blocks.length, 1)
	assert.deepEqual(jsdocSummaryLines(blocks[0].text), ['中文摘要'])
})

Deno.test('extractJsdocBlocks: ignores JSDoc inside nested template interpolations', () => {
	const blocks = extractJsdocBlocks('const s = `${`\n/** English nested */\n`}`\n/** 中文摘要 */\n')
	assert.equal(blocks.length, 1)
	assert.deepEqual(jsdocSummaryLines(blocks[0].text), ['中文摘要'])
})

Deno.test('extractJsdocBlocks: inline JSDoc before object literal property', () => {
	const blocks = extractJsdocBlocks('foo({ /** 中文摘要 */\n\tbar: 1 })\n')
	assert.equal(blocks.length, 1)
	assert.equal(blocks[0].startLine, 1)
	assert.deepEqual(jsdocSummaryLines(blocks[0].text), ['中文摘要'])
})

Deno.test('extractJsdocBlocks: ignores JSDoc-shaped text inside line comments', () => {
	const blocks = extractJsdocBlocks('// /** English doc */\n/** 中文摘要 */\n')
	assert.equal(blocks.length, 1)
	assert.deepEqual(jsdocSummaryLines(blocks[0].text), ['中文摘要'])
})

Deno.test('extractJsdocBlocks: ignores JSDoc-shaped text inside block comments', () => {
	const blocks = extractJsdocBlocks('/* /** English doc\n*/\n/** 中文摘要 */\n')
	assert.equal(blocks.length, 1)
	assert.deepEqual(jsdocSummaryLines(blocks[0].text), ['中文摘要'])
})

Deno.test('scanFileJsdocNoEnglish: flags inline empty JSDoc stub', () => {
	const text = 'GetSource(cfg, { /**\n *\n */\n\tSaveConfig: async () => {} })'
	const issues = scanFileJsdocNoEnglish('foo.mjs', text)
	assert.equal(issues.length, 1)
	assert.equal(issues[0].missingSummary, true)
	assert.equal(issues[0].line, 1)
})

Deno.test('scanFileJsdocNoEnglish: flags English summary and empty /** */', () => {
	const english = scanFileJsdocNoEnglish('foo.mjs', '/** English doc */\nexport const x = 1')
	assert.equal(english.length, 1)
	assert.equal(english[0].summary, 'English doc')
	assert.equal(english[0].missingSummary, false)

	const empty = scanFileJsdocNoEnglish('foo.mjs', '/** */\nexport const x = 1')
	assert.equal(empty.length, 1)
	assert.equal(empty[0].missingSummary, true)
	assert.equal(empty[0].summary, '')
})

Deno.test('scanFileJsdocNoEnglish: template literal English is not flagged', () => {
	const issues = scanFileJsdocNoEnglish('foo.mjs', 'const s = `/** English doc */`\n')
	assert.equal(issues.length, 0)
})

Deno.test('repo: no English or missing JSDoc summaries', async () => {
	const { issues } = await scanJsdocNoEnglish(REPO_ROOT)
	if (issues.length) {
		const sample = issues.slice(0, 12).map(issue => `${issue.path}:${issue.line} ${issue.summary || '(missing)'}`).join('\n')
		assert.fail(`English/missing JSDoc (${issues.length}):\n${sample}`)
	}
})

Deno.test('hasInlineJsdocOpening: multi-line block must open on its own line', () => {
	assert.equal(hasInlineJsdocOpening('/** 摘要 */'), false)
	assert.equal(hasInlineJsdocOpening('/**\n * 摘要\n */'), false)
	assert.equal(hasInlineJsdocOpening('/** 摘要\n * 第二行\n */'), true)
	assert.equal(hasInlineJsdocOpening('/** @typedef {{ x: number }}\n * @property {number} x\n */'), true)
	assert.equal(hasInlineJsdocOpening('/**\n *\n */'), false)
})

Deno.test('scanFileJsdocOpening: flags inline opening, ignores single-line', () => {
	const flagged = scanFileJsdocOpening('foo.mjs', '/** 摘要\n * 第二行\n */\nexport const x = 1')
	assert.equal(flagged.length, 1)
	assert.equal(flagged[0].line, 1)

	const clean = scanFileJsdocOpening('foo.mjs', '/** 摘要 */\n/**\n * 摘要\n */\n')
	assert.equal(clean.length, 0)
})

Deno.test('repo: multi-line JSDoc opens with /** alone on the first line', async () => {
	const { issues } = await scanJsdocOpening(REPO_ROOT)
	if (issues.length) {
		const sample = issues.slice(0, 12).map(issue => `${issue.path}:${issue.line}`).join('\n')
		assert.fail(`Multi-line JSDoc with content on the /** line (${issues.length}):\n${sample}`)
	}
})

Deno.test('hasInlineJsdocClosing: multi-line block must close on its own line', () => {
	assert.equal(hasInlineJsdocClosing('/** 摘要 */'), false)
	assert.equal(hasInlineJsdocClosing('/**\n * 摘要\n */'), false)
	assert.equal(hasInlineJsdocClosing('/**\n * 摘要 */'), true)
	assert.equal(hasInlineJsdocClosing('/**\n * @typedef {{ x: number }} */'), true)
})

Deno.test('scanFileJsdocClosing: flags inline closing, ignores single-line', () => {
	const flagged = scanFileJsdocClosing('foo.mjs', '/**\n * 摘要 */\nexport const x = 1')
	assert.equal(flagged.length, 1)
	assert.equal(flagged[0].line, 1)

	const clean = scanFileJsdocClosing('foo.mjs', '/** 摘要 */\n/**\n * 摘要\n */\n')
	assert.equal(clean.length, 0)
})

Deno.test('repo: multi-line JSDoc closes with */ alone on the last line', async () => {
	const { issues } = await scanJsdocClosing(REPO_ROOT)
	if (issues.length) {
		const sample = issues.slice(0, 12).map(issue => `${issue.path}:${issue.line}`).join('\n')
		assert.fail(`Multi-line JSDoc with content on the */ line (${issues.length}):\n${sample}`)
	}
})
