import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import emt, { inlineStylus } from '@cydon/ustyle'

export default defineConfig({
	root: 'examples',
	define: {
		'globalThis.CYDON_NO_UNBIND': 'true'
	},
	build: {
		assetsDir: '.',
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
		emt(),
		Unocss({
			mode: 'shadow-dom',
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno(),
			],
			transformers: [
				inlineStylus(),
				transformerDirective({ varStyle: false })
			]
		}),
		Inspect(),
		progress
	]
})
