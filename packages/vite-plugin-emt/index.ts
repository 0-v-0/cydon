import emmet, { StyleProcFunc, tagProcs } from 'emmetlite'
import { basename, posix, resolve as res } from 'path'
import readline from 'readline'
import colors from 'picocolors'
import events from 'events'
import { createReadStream, existsSync, promises as fs, readFileSync } from 'fs'
import { Plugin, ViteDevServer } from 'vite'

export * from 'emmetlite'
export type { Plugin }

type Data = {
	[x: string]: any
}

type TitleCache = {
	[x: string]: {
		title: string,
		time: number
	}
}

type TemplateCache = {
	[x: string]: string
}

export type Render = (str: string, data?: Data, maxDepth?: number) => string

export interface Option extends Omit<Plugin, 'name'> {
	log?: boolean
	alwaysReload?: boolean
	root?: string
	styleProc?: StyleProcFunc
	read?(path: string): string
	render?: Render
	tplFile?: string
	paths?: string[]
	templated?: boolean
}

export let appdata: Data[] = []

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

// https://github.com/vitejs/vite/blob/03b323d39cafe2baabef74e6051a9640add82590/packages/vite/src/node/server/hmr.ts
const getShortName = (file: string, root: string) =>
	file.startsWith(root + '/') ? posix.relative(root, file) : file

const tplCache: TemplateCache = {}

export default (config: Option = {}): Plugin => {
	let {
		log,
		read = path => path ? include(path) : '',
		root,
		render: rend = render,
		styleProc,
		tplFile = 'page.emt',
		paths = [],
		templated
	} = config
	const resolve = (p: string, base = root!, throwOnErr = true) => {
		let i = p.indexOf('?')
		p = res(process.cwd(), base, i < 0 ? p : p.substring(0, i))
		let fullPath = p
		if (!existsSync(fullPath)) {
			fullPath += '.emt'
			if (!existsSync(fullPath))
				fullPath = p + '.html'
			if (!existsSync(fullPath)) {
				if (throwOnErr)
					throw new Error('Failed to resolve ' + p)
				return ''
			}
		}
		return fullPath
	}, include = globalThis.include = (url: string) => {
		let resolved
		for (let path of paths) {
			resolved = resolve(url, path, false)
			if (resolved) break
		}
		url = resolved || resolve(url, root)
		let content = readFileSync(url, 'utf8')
		return url?.endsWith('.emt') ? emmet(content, '\t', styleProc) : content
	}
	tagProcs.push(prop => {
		const { tag, attr } = prop
		let name: string | undefined
		if (tag.includes('-'))
			name = tag
		else
			for (let i = 1; i < attr.length;) {
				const r = /^is="(.+?)"/i.exec(attr[i++])
				if (r)
					name = r[1]
			}
		if (name) {
			if (!(name in tplCache)) {
				const path = resolve(name, root, false)
				tplCache[name] = read!(path)
			}
			if (!used || !used.has(name))
				prop.content = (tplCache[name] || '') + prop.content
			used?.add(name)
		}
	})
	let used = templated ? new Set<string>() : null
	return {
		name: 'emt-template',
		enforce: 'pre',
		configureServer(server: ViteDevServer) {
			root = res(root || server.config.root)
			const titles: TitleCache = {}
			server.middlewares.use(async (req, res, next) => {
				// if not emt, next it.
				let url = req.originalUrl?.substring(1) || 'index.emt'
				if (!url.endsWith('.emt'))
					return next()

				used?.clear()
				let content = include(tplFile)
				const data: Data = { REQUEST_PATH: url, DOCUMENT_ROOT: root },
					resolved = resolve(url),
					time = (await fs.stat(resolved)).mtime.getTime()
				if (url in titles && time == titles[url].time)
					data.doc_title = titles[url].title
				else {
					const rl = readline.createInterface({
						input: createReadStream(resolved),
						crlfDelay: Infinity
					})
					rl.on('line', line => {
						line = line.trimStart()
						if (line.startsWith('title')) {
							line = line.substring(5).trimStart()
							if (line[0] == '{') {
								let a: string[] | null
								if (a = /\{(.*)}\*/.exec(line)) {
									data.doc_title = a[1]
									titles[url] = { title: a[1], time }
									rl.close()
								}
							}
						}
					})
					await events.once(rl, 'close')
				}
				content = rend(content, data)
				content = await server.transformIndexHtml?.(req.originalUrl!, content, req.originalUrl)
				res.setHeader('Content-Type', 'text/html; charset=utf-8')
				res.end(content)
			})
		},
		handleHotUpdate({ file, server }) {
			if (file.endsWith('.emt')) {
				const name = basename(file, '.emt')
				if (name.includes('-')) {
					delete tplCache[name]
					tplCache[name] = read!(file)
				}
				server.ws.send({ type: 'full-reload', path: config.alwaysReload ? '*' : file })
				if (log ?? true) {
					server.config.logger.info(
						colors.green(`page reload `) + colors.dim(getShortName(file, server.config.root)),
						{ clear: true, timestamp: true }
					)
				}
				return []
			}
			return
		},
		...config
	}
}

declare module globalThis {
	let include: (url: string) => string
	let REQUEST_PATH: string
}