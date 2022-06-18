import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import ustyle from '@cydon/ustyle'

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
		ustyle({
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno(),
			],
			transformers: [transformerDirective({ varStyle: false })]
		}),
		Inspect(),
		progress
	]
})
