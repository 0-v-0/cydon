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