import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const localesDir = path.join(rootDir, 'src', 'locales')

/**
 * 把环境语言值加入集合（规范化下划线并去掉区域后缀）。
 * @param {Set<string>} target 目标语言集合
 * @param {string} value 环境语言值
 */
function pushLocale(target, value) {
	if (value) target.add(String(value).replace(/_/g, '-').split('.')[0])
}

/**
 * 从系统环境变量收集偏好语言列表。
 * @returns {string[]} 偏好语言数组
 */
function systemLocales() {
	const out = new Set()
	pushLocale(out, process.env.LANGUAGE)
	pushLocale(out, process.env.LC_ALL)
	pushLocale(out, process.env.LANG)
	out.add('en-UK')
	return [...out]
}

/**
 * 读取可用语言列表。
 * @returns {string[]} 可用语言数组
 */
export function getAvailableLocales() {
	try {
		const csv = fs.readFileSync(path.join(localesDir, 'list.csv'), 'utf-8')
		return csv.split('\n').map(line => line.trim()).filter(Boolean).map(line => line.split(',')[0])
	}
	catch {
		return ['en-UK']
	}
}

/**
 * 解析当前使用语言。
 * @returns {string} 语言代码
 */
export function getLocale() {
	if (process.env.SUBF_LOCALE) return process.env.SUBF_LOCALE
	const available = getAvailableLocales()
	for (const pref of systemLocales()) {
		if (available.includes(pref)) return pref
		const prefix = pref.split('-')[0]
		const hit = available.find(a => a.startsWith(`${prefix}-`))
		if (hit) return hit
	}
	return 'en-UK'
}

let cache = null

/**
 * 按 key 读取翻译文案并替换模板参数。
 * @param {string} key 文案 key（点分路径）
 * @param {object} params 模板参数映射
 * @returns {string} 翻译后的文案；未命中时返回 key 本身
 */
export function getI18n(key, params) {
	const loc = getLocale()
	if (!cache || cache.loc !== loc) {
		let data = {}
		try {
			data = JSON.parse(fs.readFileSync(path.join(localesDir, `${loc}.json`), 'utf-8'))
		}
		catch { /* fall back to empty data */ }
		cache = { loc, data }
	}
	let value = cache.data
	for (const part of key.split('.')) value = value?.[part]
	if (typeof value !== 'string') return key
	if (params) 
		for (const [name, val] of Object.entries(params)) 
			value = value.replaceAll(`\${${name}}`, String(val))
		
	
	return value
}

/**
 * 翻译文案的简写。
 * @param {string} key 文案 key（点分路径）
 * @param {object} params 模板参数映射
 * @returns {string} 翻译后的文案
 */
export function t(key, params) {
	return getI18n(key, params)
}
