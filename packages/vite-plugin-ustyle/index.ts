import { writeFile } from 'fs'
import { render as stylus, RenderOptions } from 'stylus'
import emt, { Option, Plugin, render, tagProcs } from 'vite-plugin-emt'
import { EsbuildTransformOptions, transformWithEsbuild } from 'vite'
import { all } from 'known-css-properties'

export * from 'vite-plugin-emt'
export type { EsbuildTransformOptions }

export interface PluginConfig extends Option {
	inlineStyle?: boolean
	writeIndexHtml?: boolean
}

export const inlineStylus = (options?: RenderOptions): Plugin => ({
	name: 'inline-stylus',
	transformIndexHtml: html =>
		html.replace(/(<style[^>]*)\slang=(?:"styl"|'styl')([^>]*?>)([\S\s]*?)(?=<\/style>)/g,
			(_, a, b, s) => a + b + stylus(s, options!))
})

export function inlineTS(options?: EsbuildTransformOptions): Plugin {
	return {
		name: 'inline-ts',
		transform(code, id) {
			if (id.includes('html-proxy&') && id.endsWith('.js'))
				return transformWithEsbuild(code, id.slice(0, -3) + '.ts', options)
			return
		}
	}
}

const cssProps = new Set(all)

export default (config?: PluginConfig): Plugin => {
	tagProcs.unshift((prop): true | void => {
		let { match, token, result } = prop
		if (match != token) {
			const isCss = config?.inlineStyle && cssProps.has(match)
			const cls = isCss ? ' style="' : ' class="',
				len = result.length,
				last = result[len - 1],
				hasAttr = last.replace(/>.+/gs, '>').includes(cls)
			result[len - 1] = last.replace(hasAttr ? cls : '>', cls +
				token.replace(isCss ? /\s/ : /\s/g, isCss ? ':' : '-') + (hasAttr ?
					cls.length > 8 ? '' : isCss ? ';' : ' '
					: '">'))
			prop.tag = ''
			return true
		}
	})

	return emt({
		read(path) {
			// HACK: make unocss recongize classes in Shadow Root
			const html = path ? include(path) : ''
			return html.replaceAll('@unocss-placeholder', match => {
				let classes = ''
				const re = / class="([^"]+?)"/g
				let a: string[] | null
				while (a = re.exec(html))
					classes += a[1] + ' '
				if (classes)
					classes = '/* ' + classes + '*/ '
				return classes + match
			})
		},
		render(str, data) {
			str = render(str, data)
			if (config?.writeIndexHtml && data!.REQUEST_PATH == 'index.emt')
				writeFile(data!.DOCUMENT_ROOT + '/index.html', str, _ => { })
			return str
		},
		...config
	})
}

declare let include: (url: string) => string