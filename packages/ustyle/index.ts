import { writeFile } from 'fs'
import { render as stylus, RenderOptions } from 'stylus'
import emt, { Option, Plugin, render, tagProcs } from 'vite-plugin-emt'

export * from 'vite-plugin-emt'

export interface PluginConfig extends Option {
	writeIndexHtml?: boolean
}

tagProcs.unshift(prop => {
	if (prop.tag[0] == '>') {
		prop.tag = ''
		return true
	}
	return
})

export type MagicString = {
	overwrite(start: number, end: number, content: string): void
	length(): number
	toString(): string
}

export const inlineStylus = (options?: RenderOptions) => ({
	name: 'inline-stylus',
	enforce: <const>'pre',
	idFilter: (id: string) => id.endsWith('.css'),
	async transform(code: MagicString) {
		code.overwrite(0, code.length(), stylus(code + '', options!))
	}
})

export default (config?: PluginConfig): Plugin => emt({
	read(path) {
		// HACK: make unocss recongize classes in Shadow Root
		const html = path ? include(path) : ''
		return html.replaceAll('@unocss-placeholder', match => {
			let classes = ''
			const re = RegExp(/ class="([^"]+)"/, 'g')
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
	styleProc(buffer, tag, _attr, result) {
		if (!tag)
			return buffer
		buffer = '-' + buffer
		let cls = ' class="'
		if (tag[0] == '>')
			cls += tag = tag.substring(1)
		else
			buffer = tag + buffer
		const len = result.length,
			last = result[len - 1],
			s = last.replace(/>[\S\s]+/g, '>')
		result[len - 1] = s.includes(cls) ?
			last.replace(cls, cls + buffer + (cls.length > 8 ? '' : ' ')) :
			last.replace('>', cls + buffer + '">')
		return '>' + buffer
	},
	...config
})

declare let include: (url: string) => string