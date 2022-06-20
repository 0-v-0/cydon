import emmet, { StyleProcFunc, tagProcs } from 'emmetlite'
import { resolve as res } from 'path'
import readline from 'readline'
import colors from 'picocolors'
import events from 'events'
import { createReadStream, existsSync, promises as fs, readFileSync } from 'fs'
import { basename, posix } from 'path'
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

export type Render = (str: string, data: Data, maxDepth?: number) => string

export interface Option extends Omit<Plugin, 'name'> {
	log?: boolean
	alwaysReload?: boolean
	root?: string
	styleProc?: StyleProcFunc
	read?(path: string): string
	render?: Render
	template?: string
}

export const appdata: Data = {}

const encoder = new TextEncoder,
	decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }),
	getStr = (len: number, ptr: number) => decoder.decode(mem.subarray(ptr, ptr + len)),
	getCStr = (ptr: number) => {
		if (!ptr) return ''
		let i = ptr
		while (mem[i]) i++
		return getStr(i - ptr, ptr)
	},
	writeStr = (str: string, ptr: number) =>
		encoder.encodeInto(str + '', mem.subarray(ptr, ptr + (24 << 10))).written!,
	flatten = (obj: any[]) => obj.length && obj.join ? '\0' + obj.join('\0')
		: Object.getOwnPropertyNames(obj).join('\0'),
	env = {
		getValue(len: number, ptr: number) {
			let key = getStr(len, ptr)
			let value = key in appdata ? appdata[key] : '$' + key
			if (typeof value == 'object')
				value = flatten(value)
			return writeStr((value + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
				exp.inbuf.value)
		},
		setValue(len: number, ptr: number, len2: number, ptr2: number) {
			appdata[getStr(len, ptr)] = getStr(len2, ptr2)
		},
		push() { },
		popFront() { },
		flushBuffer(len: number, ptr: number) { buffer += getStr(len, ptr); },
		evalExpr(len: number, ptr: number) {
			let expr = getStr(len, ptr)
			globalThis.REQUEST_PATH = appdata.REQUEST_PATH
			if (expr.trimStart().startsWith('include'))
				try {
					expr = (0, eval)(expr)
				} catch (e) {
					console.error(e)
				}
			else
				expr = '&#36;{' + expr + '}'
			return writeStr(expr, exp.inbuf.value)
		}
	}

let lastlen: number, buffer: string, exp: any, mem: Uint8Array

export let render: (str: string, data: Data, maxDepth?: number) => string
try {
	// TODO: polyfill fetch for Node 16
	WebAssembly.instantiateStreaming(fetch(new URL('./simpletpl.wasm', import.meta.url).href), { env })
		.then(obj => {
			exp = obj.instance.exports
			mem = new Uint8Array(exp.memory.buffer)
			render = (str: string, data?, maxDepth = 5) => {
				if (str)
					lastlen = writeStr(str, exp.buf.value)
				if (data)
					Object.assign(appdata, data)
				buffer = ''
				let err = getCStr(exp.render(lastlen, exp.buf.value, maxDepth))
				if (err)
					throw new Error(err)
				return buffer
			}
		})
} catch (e) {
	console.error(e)
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
		template = 'page.emt'
	} = config
	const resolve = (p: string, throwOnErr = true) => {
		let i = p.indexOf('?')
		p = res(process.cwd(), root!, i < 0 ? p : p.substring(0, i))
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
		let content = readFileSync(resolve(url), 'utf8')
		return url?.endsWith('.emt') ? emmet(content, '\t', styleProc) : content
	};
	tagProcs.push(prop => {
		const { tag } = prop
		if (tag.includes('-')) {
			if (!(tag in tplCache)) {
				const path = resolve(tag, false)
				tplCache[tag] = read!(path)
			}
			prop.content = (tplCache[tag] || '') + prop.content
		}
	})
	return {
		name: 'emt-template',
		enforce: 'pre',
		configureServer(server: ViteDevServer) {
			root = res(root || server.config.root)
			const titles: TitleCache = {}
			server.middlewares.use(async (req, res, next) => {
				// if not emt, next it.
				let url = req.url?.substring(1) || 'index.emt'
				if (!url.endsWith('.emt'))
					return next()

				let content = emmet(await fs.readFile(resolve(template), 'utf8'),
					'\t', styleProc)
				const data: Data = { REQUEST_PATH: url, DOCUMENT_ROOT: root },
					time = (await fs.stat(resolve(url))).mtime.getTime()
				if (url in titles && time == titles[url].time)
					data.doc_title = titles[url].title
				else {
					const rl = readline.createInterface({
						input: createReadStream(resolve(url)),
						crlfDelay: Infinity
					})
					rl.on('line', line => {
						line = line.trimStart()
						if (line.startsWith('title')) {
							line = line.substring(5).trimStart()
							if (line[0] == '{') {
								let a: string[] | null
								if (a = /\s*\{(.*)\}\*/.exec(line)) {
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
				content = await server.transformIndexHtml?.(req.url!, content, req.originalUrl)
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