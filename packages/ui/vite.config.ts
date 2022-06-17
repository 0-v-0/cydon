import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import Unocss from 'unocss/vite'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import emt, { tagProcs } from 'vite-plugin-emt'

tagProcs.unshift(prop => {
	if (prop.tag[0] == '>') {
		prop.tag = ''
		return true
	}
	return
})

export default defineConfig({
	root: 'examples',
	build: {
		sourcemap: 'hidden',
		target: 'esnext'
	},
	optimizeDeps: {
		include: ['cydon'],
		esbuildOptions: {
			target: 'esnext'
		}
	},
	plugins: [
		Unocss({
			mode: 'shadow-dom',
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno(),
			],
			transformers: [transformerDirective()]
		}),
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
			}
		}),
		Inspect(),
		progress
	]
})

declare let include: (url: string) => string