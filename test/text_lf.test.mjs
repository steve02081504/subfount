/**
 * 仓库 UTF-8 文本文件须使用 LF 换行。
 */
import assert from 'node:assert/strict'

import {
	detectFinalNewline, detectLeadingLf, detectNonLfLineEndings, fixFileTextLf, fixTextLf,
	isUtf8Text, REPO_ROOT, scanFileTextLf, scanTextLf,
} from '../src/scripts/checks/text_lf.mjs'

const encoder = new TextEncoder()

Deno.test('isUtf8Text: accepts plain UTF-8', () => {
	assert.ok(isUtf8Text(encoder.encode('hello\n中文')))
})

Deno.test('isUtf8Text: rejects NUL and invalid UTF-8', () => {
	assert.equal(isUtf8Text(new Uint8Array([0x61, 0x00, 0x62])), false)
	assert.equal(isUtf8Text(new Uint8Array([0xff, 0xfe])), false)
})

Deno.test('detectNonLfLineEndings: LF only', () => {
	assert.equal(detectNonLfLineEndings(encoder.encode('{\n"a": 1\n}')), null)
})

Deno.test('detectNonLfLineEndings: CRLF', () => {
	assert.equal(detectNonLfLineEndings(encoder.encode('{\r\n"a": 1\r\n}')), 'crlf')
})

Deno.test('detectNonLfLineEndings: lone CR', () => {
	assert.equal(detectNonLfLineEndings(encoder.encode('{\r"a": 1\r}')), 'cr')
})

Deno.test('detectNonLfLineEndings: mixed', () => {
	assert.equal(detectNonLfLineEndings(encoder.encode('{\r\n"a": 1\r}')), 'mixed')
})

Deno.test('detectFinalNewline', () => {
	assert.equal(detectFinalNewline(encoder.encode('a')), 'none')
	assert.equal(detectFinalNewline(encoder.encode('a\n')), 'single')
	assert.equal(detectFinalNewline(encoder.encode('a\n\n')), 'multiple')
	assert.equal(detectFinalNewline(encoder.encode('a\r\n')), 'single')
	assert.equal(detectFinalNewline(new Uint8Array([])), 'none')
})

Deno.test('detectLeadingLf', () => {
	assert.equal(detectLeadingLf(encoder.encode('\na')), true)
	assert.equal(detectLeadingLf(encoder.encode('\n\n')), true)
	assert.equal(detectLeadingLf(encoder.encode('a\n')), false)
	assert.equal(detectLeadingLf(new Uint8Array([])), false)
})

Deno.test('detectLeadingLf skips UTF-8 BOM', () => {
	const bom = new Uint8Array([0xef, 0xbb, 0xbf])
	assert.equal(detectLeadingLf(new Uint8Array([...bom, 10, ...encoder.encode('a')])), true)
	assert.equal(detectLeadingLf(new Uint8Array([...bom, ...encoder.encode('a')])), false)
})

Deno.test('scanFileTextLf: compliant files', () => {
	assert.deepEqual(scanFileTextLf('ok.mjs', encoder.encode('a\nexport {}\n')), [])
	assert.deepEqual(scanFileTextLf('empty.txt', new Uint8Array([])), [])
	assert.deepEqual(scanFileTextLf('ok-bom.mjs', new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode('a\nb\n')])), [])
})

Deno.test('scanFileTextLf: non-LF and boundary issues', () => {
	assert.equal(scanFileTextLf('bad.mjs', encoder.encode('export {}\r\n'))[0].kind, 'crlf')
	assert.equal(scanFileTextLf('no-final.mjs', encoder.encode('a\nb'))[0].kind, 'no-final-newline')
	assert.equal(scanFileTextLf('extra-final.mjs', encoder.encode('a\nb\n\n'))[0].kind, 'extra-final-newlines')
	assert.equal(scanFileTextLf('leading.mjs', encoder.encode('\nexport {}\n'))[0].kind, 'leading-newline')
	assert.deepEqual(
		scanFileTextLf('leading-bom.mjs', new Uint8Array([0xef, 0xbb, 0xbf, 10, ...encoder.encode('export {}')]))
			.map(issue => issue.kind)
			.sort(),
		['leading-newline', 'no-final-newline'],
	)
})

Deno.test('scanFileTextLf: single-line svg must not end with LF; other files need exactly one', () => {
	assert.deepEqual(scanFileTextLf('icon.svg', encoder.encode('<svg></svg>')), [])
	assert.equal(scanFileTextLf('icon.svg', encoder.encode('<svg></svg>\n'))[0].kind, 'unexpected-final-newline')
	assert.equal(scanFileTextLf('icon.svg', encoder.encode('<svg></svg>\n\n'))[0].kind, 'unexpected-final-newline')
	assert.deepEqual(scanFileTextLf('multi.svg', encoder.encode('<svg>\n<g></g>\n')), [])
	assert.equal(scanFileTextLf('single.txt', encoder.encode('abc'))[0].kind, 'no-final-newline')
	assert.equal(scanFileTextLf('single.mjs', encoder.encode('export {}'))[0].kind, 'no-final-newline')
	assert.deepEqual(scanFileTextLf('single.txt', encoder.encode('abc\n')), [])
	assert.equal(scanFileTextLf('single.txt', encoder.encode('abc\n\n'))[0].kind, 'extra-final-newlines')
	assert.equal(scanFileTextLf('icon.svg', encoder.encode('<svg></svg>\n<g></g>'))[0].kind, 'no-final-newline')
	assert.equal(scanFileTextLf('multi.mjs', encoder.encode('a\nb'))[0].kind, 'no-final-newline')
	assert.deepEqual(scanFileTextLf('multi.mjs', encoder.encode('a\nb\n')), [])
	assert.equal(scanFileTextLf('multi.mjs', encoder.encode('a\nb\n\n'))[0].kind, 'extra-final-newlines')
})

Deno.test('fixFileTextLf: compliant files return null', () => {
	assert.equal(fixFileTextLf('ok.mjs', encoder.encode('a\nexport {}\n')), null)
	assert.equal(fixFileTextLf('empty.txt', new Uint8Array([])), null)
	assert.equal(fixFileTextLf('icon.svg', encoder.encode('<svg></svg>')), null)
	assert.equal(
		fixFileTextLf('ok-bom.mjs', new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode('a\nb\n')])),
		null,
	)
})

Deno.test('fixFileTextLf: non-LF and boundary fixes', () => {
	assert.deepEqual(fixFileTextLf('bad.mjs', encoder.encode('export {}\r\n')), encoder.encode('export {}\n'))
	assert.deepEqual(fixFileTextLf('bad.mjs', encoder.encode('a\rb')), encoder.encode('a\nb\n'))
	assert.deepEqual(fixFileTextLf('no-final.mjs', encoder.encode('a\nb')), encoder.encode('a\nb\n'))
	assert.deepEqual(fixFileTextLf('extra-final.mjs', encoder.encode('a\nb\n\n')), encoder.encode('a\nb\n'))
	assert.deepEqual(fixFileTextLf('leading.mjs', encoder.encode('\nexport {}\n')), encoder.encode('export {}\n'))
	assert.deepEqual(
		fixFileTextLf('leading-bom.mjs', new Uint8Array([0xef, 0xbb, 0xbf, 10, ...encoder.encode('export {}')])),
		new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode('export {}\n')]),
	)
})

Deno.test('fixFileTextLf: single-line svg drops trailing LF; other files keep exactly one', () => {
	assert.deepEqual(fixFileTextLf('icon.svg', encoder.encode('<svg></svg>\n')), encoder.encode('<svg></svg>'))
	assert.deepEqual(fixFileTextLf('icon.svg', encoder.encode('<svg></svg>\n\n')), encoder.encode('<svg></svg>'))
	assert.equal(fixFileTextLf('multi.svg', encoder.encode('<svg>\n<g></g>\n')), null)
	assert.deepEqual(fixFileTextLf('single.txt', encoder.encode('abc')), encoder.encode('abc\n'))
	assert.deepEqual(fixFileTextLf('single.mjs', encoder.encode('export {}')), encoder.encode('export {}\n'))
	assert.equal(fixFileTextLf('single.txt', encoder.encode('abc\n')), null)
	assert.deepEqual(fixFileTextLf('single.txt', encoder.encode('abc\n\n')), encoder.encode('abc\n'))
	assert.deepEqual(fixFileTextLf('icon.svg', encoder.encode('<svg></svg>\n<g></g>')), encoder.encode('<svg></svg>\n<g></g>\n'))
	assert.deepEqual(fixFileTextLf('multi.mjs', encoder.encode('a\nb')), encoder.encode('a\nb\n'))
	assert.equal(fixFileTextLf('multi.mjs', encoder.encode('a\nb\n')), null)
	assert.deepEqual(fixFileTextLf('multi.mjs', encoder.encode('a\nb\n\n')), encoder.encode('a\nb\n'))
})

Deno.test('repo: UTF-8 text files use LF, correct final LF, no leading LF (auto-fix)', async () => {
	const fixed = await fixTextLf(REPO_ROOT)
	const { issues } = await scanTextLf(REPO_ROOT)
	if (fixed.length)
		console.log(`自动修复 ${fixed.length} 个文件的换行:\n${fixed.join('\n')}`)
	if (issues.length) {
		const sample = issues.slice(0, 12).map(issue => `${issue.path} (${issue.kind})`).join('\n')
		assert.fail(`文本文件须使用 LF 换行、结尾 LF 符合规则且开头不为 LF (${issues.length}):\n${sample}`)
	}
})
