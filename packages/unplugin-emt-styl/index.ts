import emmet, { tagProcs } from 'emmetlite'
import { basename, resolve as res } from 'path'
import readline from 'readline'
import events from 'events'
import MagicString from 'magic-string'
import { createReadStream, existsSync, promises as fs, readFileSync } from 'fs'
import { createEsbuildPlugin, createFarmPlugin, createRollupPlugin, createRspackPlugin, createVitePlugin, UnpluginFactory } from 'unplugin'
import { Data, Render, render } from './simpletpl'
import { all } from 'known-css-properties'

export * from 'emmetlite'
export * from './simpletpl'
export type PluginFactory = UnpluginFactory<Options | undefined>
export type Preprocessor = (s: TemplateStringsArray, ...args: any[]) => string

type TitleCache = Record<string, {
	title: string,
	time: number
}>

export interface Options {
	alwaysReload?: boolean
	classy?: boolean
	cssProps?: Set<string>
	literal?: string
	paths?: string[]
	root?: string
	read?(path: string): string
	render?: Render
	tplFile?: string
	templated?: boolean
	writeHtml?: boolean
}

const factory: PluginFactory = (config: Options = {}) => {
	const r = (path: string) => {
		// HACK: make unocss recongize classes in Shadow Root
		const html = path ? include(path) : ''
		return html.replace(/@unocss-placeholder/g, match => {
			let classes = ''
			const re = / class="(.+?)"/gs
			for (let a: string[] | null; (a = re.exec(html));)
				classes += a[1] + ' '
			return (classes &&= '/* ' + classes + '*/ ') + match
		})
	}
	const {
		alwaysReload = false,
		classy = true,
		literal = 'emt',
		read = r,
		render: rend = render,
		tplFile = 'page.emt',
		root = process.cwd(),
		paths = [],
		templated = true,
		writeHtml = true,
	} = config
	if (classy) {
		const { cssProps = new Set(all) } = config
		tagProcs.unshift((prop): true | void => {
			const { match, token, result } = prop
			if (match != token) {
				const isCss = cssProps.has(match)
				const attr = isCss ? ' style="' : ' class="',
					len = result.length,
					last = result[len - 1],
					str = token.replace(/\$/g, '$$$$')
						.replace(isCss ? /\s/ : /\s/g, isCss ? ':' : '-')
				result[len - 1] =
					last.replace(/>.+/gs, '>').includes(attr) ?
						last.replace(RegExp(`(${attr}.+?)"`, 's'),
							'$1' + (isCss ? ';' : ' ') + str + '"') :
						last.replace('>', attr + str + '">')
				prop.tag = ''
				return true
			}
		})
	}
	const resolve = (p: string, base = root, throwOnErr = false) => {
		let i = p.indexOf('?')
		p = res(process.cwd(), base || '.', i < 0 ? p : p.substring(0, i))
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
		const deps = depsStack[depsStack.length - 1]
		if (deps && url?.endsWith('.emt'))
			deps.add(url)
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
				const r = /^is="(.+?)"/is.exec(attr[i++])
				if (r) {
					name = r[1]
					break
				}
			}
		if (name) {
			const content = read!(resolveAll(name, false))
			prop.content = (used?.has(name) ?
				content.replace(/<script [^>]*?type="module"[^>]*?>.*?<\/script>/gis, '') :
				content) + prop.content
			used?.add(name)
		}
	})
	const used = templated ? new Set<string>() : null
	const titles: TitleCache = {}
	// HMR dependency tracking: for each rendered page (keyed by its emt path),
	// the set of emt files it depends on (itself, included files, templates).
	const pageDeps = new Map<string, Set<string>>()
	// Pages that have been requested recently (keyed by emt path, value = last access time).
	const openPages = new Map<string, number>()
	const OPEN_PAGE_TTL = 5 * 60 * 1000
	// While a page is being rendered (synchronously), the stack holds that
	// page's dependency set so include() can record each emt file it pulls in.
	const depsStack: Set<string>[] = []
	async function getData(url: string, path: string) {
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
						if ((a = /\{(.*)}\*/.exec(line))) {
							data.doc_title = a[1]
							titles[url] = { title: a[1], time }
							rl.close()
						}
					}
				}
			})
			await events.once(rl, 'close')
		}
		return data
	}
	// Render an emt file (by its url/path) into a full HTML document.
	// used to serve/build html when writeHtml is disabled.
	async function renderEmt(url: string, path: string) {
		used?.clear()
		const deps = new Set<string>()
		deps.add(path)
		const data = await getData(url, path)
		depsStack.push(deps)
		try {
			const result = rend(include('doc_title' in data ? tplFile : path), data)
			if (used)
				for (const name of used) {
					const resolved = resolveAll(name, false)
					if (resolved?.endsWith('.emt'))
						deps.add(resolved)
				}
			pageDeps.set(path, deps)
			return result
		} finally {
			depsStack.pop()
		}
	}
	// Given an html url/path, return the matching emt file path if the html
	// itself does not exist but the emt does. Otherwise return ''.
	const resolveEmtForHtml = (url: string) => {
		if (!url.endsWith('.html'))
			return ''
		const htmlPath = resolve(url)
		if (htmlPath && existsSync(htmlPath))
			return ''
		const emtUrl = url.substring(0, url.length - 5) + '.emt'
		const emtPath = resolve(emtUrl)
		return emtPath && existsSync(emtPath) && emtPath.endsWith('.emt') ? emtPath : ''
	}
	// Track the virtual html ids we returned from resolveId so that load
	// only renders those and never a real .html file on disk.
	const virtualHtmlIds = new Set<string>()
	// The virtual id is the emt file path with the extension replaced by .html
	// so vite's html pipeline (filter /\.html$/) picks it up, and asset URLs
	// resolve relative to the emt's directory.
	const toVirtualHtmlId = (emtPath: string) =>
		emtPath.substring(0, emtPath.length - 4) + '.html'
	return {
		name: 'emt-template',
		enforce: 'pre',
		async watchChange(id, { event }) {
			if (!id.endsWith('.emt'))
				return
			const path = resolve(id)
			if (!path)
				return
			if (event == 'delete') {
				delete titles[id]
				used?.delete(id)
				pageDeps.delete(id)
				openPages.delete(id)
				return
			}
			used?.clear()
			const data = await getData(id, path)
			const content = rend(include('doc_title' in data ? tplFile : path), data)
			if (writeHtml) {
				const output = data.DOCUMENT_ROOT + '/' + basename(data.REQUEST_PATH, '.emt') + '.html'
				let old
				try {
					old = await fs.readFile(output, 'utf8')
				} catch { }
				if (old != content)
					fs.writeFile(output, content)
			}
		},
		// parse emt`...`
		transform(code, id) {
			if (literal && (id.endsWith('.js') || id.endsWith('.ts'))) {
				const ms = new MagicString(code)
				return {
					code: ms.replace(RegExp('\\b' + literal + '\\s*`(.*?)(?<!\\\\)`', 'gs'),
						(_, s) => '`' + emmet(s, '\t') + '`').toString(),
					map: ms.generateMap({ source: id })
				}
			}
			return
		},
		// Build: resolve an html entry to a virtual html module when the html
		// file does not exist but the matching emt does. The virtual id is the
		// emt file path with the extension replaced by .html so that vite's
		// html pipeline (which filters by /\.html$/) picks it up, and asset
		// URLs resolve relative to the emt's directory.
		resolveId(id) {
			if (!id.endsWith('.html'))
				return
			// skip if the html file actually exists on disk
			const htmlPath = resolve(id)
			if (htmlPath && existsSync(htmlPath))
				return
			const emtPath = resolveEmtForHtml(id)
			if (emtPath) {
				const virtualId = toVirtualHtmlId(emtPath)
				virtualHtmlIds.add(virtualId)
				return virtualId
			}
			return
		},
		// Build: load the virtual html module by rendering the emt source.
		async load(id) {
			if (!virtualHtmlIds.has(id))
				return
			const emtPath = id.substring(0, id.length - 5) + '.emt'
			return renderEmt(emtPath, emtPath)
		},
		vite: {
			// Dev: intercept html requests that have no html file but a matching
			// emt file, render the html on the fly and hand it to vite.
			// We return a function so the middleware is installed after vite's
			// own htmlFallback middleware (which rewrites "/" to "/index.html").
			configureServer(server) {
				const viteRoot = server.config.root
				const resolveAbs = (p: string) => res(viteRoot, p)
				return () => {
					server.middlewares.use(async (req, resp, next) => {
						if (resp.writableEnded) return next()
						const url = req.url && req.url.split('?')[0].split('#')[0]
						if (!url || !url.endsWith('.html') || req.headers['sec-fetch-dest'] === 'script')
							return next()
						const rel = url.startsWith('/') ? url.substring(1) : url
						// resolve relative to vite's root (where html entries live)
						const htmlAbs = resolveAbs(rel)
						if (existsSync(htmlAbs))
							return next()
						const emtAbs = htmlAbs.substring(0, htmlAbs.length - 5) + '.emt'
						if (!existsSync(emtAbs))
							return next()
						openPages.set(emtAbs, Date.now())
						try {
							const html = await renderEmt(emtAbs, emtAbs)
							const transformed = await server.transformIndexHtml(url, html, req.originalUrl)
							resp.setHeader('Content-Type', 'text/html; charset=utf-8')
							resp.end(transformed)
						} catch (e) {
							next(e)
						}
					})
					// HMR: reload the browser when an emt file that an open page
					// depends on changes. alwaysReload reloads on any emt change.
					server.watcher.on('change', (file: string) => {
						if (!file.endsWith('.emt'))
							return
						const now = Date.now()
						for (const [page, time] of openPages) {
							if (now - time > OPEN_PAGE_TTL)
								openPages.delete(page)
						}
						if (alwaysReload) {
							server.ws.send({ type: 'full-reload' })
							return
						}
						for (const page of openPages.keys()) {
							const deps = pageDeps.get(page)
							if (deps && deps.has(file)) {
								server.ws.send({ type: 'full-reload' })
								return
							}
						}
					})
					server.watcher.on('unlink', (file: string) => {
						if (!file.endsWith('.emt'))
							return
						pageDeps.delete(file)
						openPages.delete(file)
					})
				}
			},
		},
		...config
	}
}

export default factory

export const esbuild = createEsbuildPlugin(factory)
export const farm = createFarmPlugin(factory)
export const rollup = createRollupPlugin(factory)
export const rspack = createRspackPlugin(factory)
export const vite = createVitePlugin(factory)

declare namespace globalThis {
	let include: (url: string) => string
}