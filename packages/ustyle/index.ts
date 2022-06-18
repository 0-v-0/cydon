import { Plugin, PluginOption } from 'vite'
import Unocss, { VitePluginConfig } from 'unocss/vite'
import { writeFile } from 'fs'
import emt, { Option as emtOption, render, tagProcs } from 'vite-plugin-emt'
import { render as stylus, RenderOptions } from 'stylus'

export interface PluginConfig<Theme extends {} = {}> extends VitePluginConfig<Theme>, emtOption {
	stylus?: RenderOptions
	writeIndexHtml?: boolean
}

tagProcs.unshift(prop => {
	if (prop.tag[0] == '>') {
		prop.tag = ''
		return true
	}
	return
})

export default <Theme extends {} = {}>(config?: PluginConfig<Theme>): [Plugin, PluginOption] => {
	if (config?.transformers)
		config.transformers.push({
			name: 'inline-stylus',
			enforce: 'pre',
			idFilter: id => /\.css$/.test(id),
			transform(code) {
				code.overwrite(0, code.length(), stylus(code.original, config.stylus!))
			}
		})
	return [
		emt({
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
				if (config?.writeIndexHtml && data.REQUEST_PATH == 'index.emt')
					writeFile(data.DOCUMENT_ROOT + '/index.html', str, _ => { })
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
		}),
		Unocss({
			mode: 'shadow-dom',
			...config
		})
	]
}

declare let include: (url: string) => string