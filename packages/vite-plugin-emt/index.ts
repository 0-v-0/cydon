import emmet, { tagProcs } from 'emmetlite'
import { basename, posix, resolve as res } from 'path'
import readline from 'readline'
import colors from 'picocolors'
import events from 'events'
import MagicString from 'magic-string'
import { createReadStream, existsSync, promises as fs, readFileSync, writeFile } from 'fs'
import { Plugin, ViteDevServer } from 'vite'
import { Data, Render, render } from './simpletpl'

export * from 'emmetlite'
export * from './simpletpl'
export type { Plugin }

type TitleCache = Record<string, {
	title: string,
	time: number
}>

type TemplateCache = Record<string, any>

export interface Option extends Omit<Plugin, 'name'> {
	alwaysReload?: boolean
	emtLiteral?: boolean
	log?: boolean
	paths?: string[]
	root?: string
	read?(path: string): string
	render?: Render
	tplFile?: string
	templated?: boolean
	writeHtml?: boolean
}

// https://github.com/vitejs/vite/blob/03b323d39cafe2baabef74e6051a9640add82590/packages/vite/src/node/server/hmr.ts
const getShortName = (file: string, root: string) =>
	file.startsWith(root + '/') ? posix.relative(root, file) : file

const tplCache: TemplateCache = {}

export default (config: Option = {}): Plugin => {
	let {
		emtLiteral = true,
		log,
		read = path => path ? include(path) : '',
		root,
		render: rend = render,
		tplFile = 'page.emt',
		paths = [],
		templated = true,
		writeHtml
	} = config
	const resolve = (p: string, base = root!, throwOnErr = false) => {
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
	}, resolveAll = (url: string, throwOnErr = true) => {
		let resolved
		for (const path of paths) {
			resolved = resolve(url, path)
			if (resolved) break
		}
		return resolved || resolve(url, root, throwOnErr)
	}, include = globalThis.include = (url: string) => {
		url = resolveAll(url)
		const content = readFileSync(url, 'utf8')
		return url?.endsWith('.emt') ? emmet(content, '\t') : content
	}
	tagProcs.push(prop => {
		const { tag, attr } = prop
		let name: string | undefined
		if (tag.includes('-'))
			name = tag
		else
			for (let i = 1; i < attr.length;) {
				const r = /^is="(.+?)"/i.exec(attr[i++])
				if (r) {
					name = r[1]
					break
				}
			}
		if (name) {
			let content: string
			if (name in tplCache)
				content = tplCache[name]
			else
				tplCache[name] = content = read!(resolveAll(name, false))
			prop.content = (!used?.has(name) ? content :
				content.replace(/<script [^>]*?type="module"[^>]*?>[\S\s]*?<\/script>/gi, '')) + prop.content
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
				const url = req.originalUrl?.substring(1) || 'index.emt'
				if (!url.endsWith('.emt'))
					return next()

				const path = resolve(url)
				if (!path)
					return next()

				used?.clear()
				const data: Data = { REQUEST_PATH: url, DOCUMENT_ROOT: root },
					time = (await fs.stat(path)).mtime.getTime()
				if (url in titles && time == titles[url].time)
					data.doc_title = titles[url].title
				else {
					const rl = readline.createInterface({
						input: createReadStream(path),
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
				const content = rend(include('doc_title' in data ? tplFile : path), data)
				if (writeHtml)
					writeFile(data.DOCUMENT_ROOT + '/' + basename(url, '.emt') + '.html', content, _ => { })
				res.setHeader('Content-Type', 'text/html; charset=utf-8')
				res.end('doc_title' in data ?
					await server.transformIndexHtml?.(req.originalUrl!, content, req.originalUrl) :
					content)
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
		transform(code, id) {
			if (emtLiteral && (id.endsWith('.js') || id.endsWith('.ts'))) {
				const ms = new MagicString(code)
				return {
					code: ms.replace(/\bemt\s*`(.*?)(?<!\\)`/gs,
						(_, s) => '`' + emmet(s, '\t') + '`').toString(),
					map: ms.generateMap({ source: id })
				}
			}
			return
		},
		...config
	}
}

declare module globalThis {
	let include: (url: string) => string
}