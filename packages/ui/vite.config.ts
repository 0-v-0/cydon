import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import Unocss from 'unocss/vite'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import emt from 'vite-plugin-emt'

export default defineConfig({
	root: 'examples',
	build: {
		sourcemap: 'hidden'
	},
	optimizeDeps: {
		include: ['cydon']
	},
	plugins: [
		Unocss({
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno(),
			],
			transformers: [transformerDirective()]
		}),
		emt(),
		Inspect(),
		progress
	]
})
