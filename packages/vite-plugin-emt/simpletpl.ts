// Template Syntax: https://github.com/0-v-0/dast/tree/main/simpletpl

export type Data = Record<string, any>

export type Render = (str: string, data?: Data, maxDepth?: number) => string

let appdata: Data[] = []

const flatten = (obj: any[]) => obj.length && obj.join ? '\0' + obj.join('\0')
	: Object.getOwnPropertyNames(obj).join('\0')

const getBlock = (str: string, start = '[', end = ']') => {
	str = str.trimStart()
	if (str[0] != start)
		return ''
	let level = 1, i = 1
	for (; i < str.length; i++) {
		if (str[i] == start) level++
		else if (str[i] == end) level--
		if (!level) break
	}
	return str.substring(1, i)
}, getValue = (key: string): string => {
	let raw = key[0] == ':'
	if (raw)
		key = key.substring(1)
	let value = ''
	for (const dat of appdata) {
		if (key in dat) {
			value = dat[key]
			break
		}
	}
	if (typeof value == 'object')
		value = flatten(value)
	return raw ? value : (value + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}, push = () => {
	appdata.unshift({})
}, pop = () => {
	appdata.shift()
}, rend = (tpl: string, maxDepth = 5) => {
	let str = ''
	do {
		let i = tpl.indexOf('$') + 1
		if (!i) break
		str += tpl.substring(0, i - 1)
		tpl = tpl.substring(i)
		let expr: string,
			s = ''
		if (tpl[0] == '{') { // expr
			expr = getBlock(tpl, '{', '}')
			if (!expr)
				break
			if (!maxDepth)
				throw new Error('MaxDepth exceeded')
			if (expr.trimStart().startsWith('include'))
				try {
					s = (0, eval)(expr)
				} catch (e) {
					console.error(e)
				}
			else
				s = '&#36;{' + expr + '}'
			push()
			str += rend(s, maxDepth - 1)
			pop()
			tpl = tpl.substring(expr.length + 2)
			continue
		}
		let re = /^:?[a-z0-9_.]+/i,
			a = re.exec(tpl)
		if (!a) continue
		const [key] = a,
			val = getValue(key)
		tpl = tpl.substring(key.length)
		re = /^\s*\?\s*/
		a = re.exec(tpl)
		if (a) { // cond
			s = tpl.substring(a[0].length)
			expr = getBlock(s)
			if (expr) {
				const cond = val && val != '0' && val != 'false'
				if (cond)
					str += rend(expr, maxDepth)
				s = s.substring(expr.length + 2).trimStart()
				if (s[0] == ':') {
					let t = s.substring(1).trimStart()
					expr = getBlock(t)
					if (expr) {
						if (!cond)
							str += rend(expr, maxDepth)
						s = t.substring(expr.length + 2)
					}
				}
				tpl = s
				continue
			}
		}
		re = /^\s*:\s*/
		a = re.exec(tpl)
		if (a) { // loop
			s = tpl.substring(a[0].length)
			re = /^([a-z0-9_.]+)(?:\s+([a-z0-9_.]+))?/i
			a = re.exec(s)
			let [expr, keyname, valname] = a || ['']
			if (!valname) {
				valname = keyname
				keyname = ''
			}
			s = s.substring(expr.length).trimStart()
			expr = getBlock(s)
			if (expr) {
				const isArray = val[0] == '\0'
				if (val.length > +isArray) {
					push()
					const arr = val.substring(+isArray).split('\0'),
						data = appdata[0]
					for (i = 0; i < arr.length; i++) {
						if (isArray) {
							if (keyname)
								data[keyname] = i
							if (valname)
								data[valname] = arr[i]
						} else {
							let fullkey = key + '.' + arr[i]
							if (fullkey.length > 256)
								throw new Error('Name too long')
							if (keyname)
								data[keyname] = fullkey
							if (valname)
								data[valname] = getValue(fullkey)
						}
						str += rend(expr, maxDepth)
					}
					pop()
				}
				tpl = s.substring(expr.length + 2)
				continue
			}
		}
		str += val || '$' + key
	} while (tpl)
	return str + tpl
}

export const render: Render = (tpl, data = {}, maxDepth = 5) => {
	globalThis.REQUEST_PATH = data.REQUEST_PATH
	appdata = [data]
	return rend(tpl, maxDepth)
}

declare module globalThis {
	let REQUEST_PATH: string
}