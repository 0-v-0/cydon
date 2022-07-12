import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import emt, { inlineStylus } from '@cydon/ustyle'

export const commonConfig = {
	root: 'examples',
	define: {
		'globalThis.CYDON_NO_UNBIND': 'true'
	},
	optimizeDeps: {
		include: ['cydon'],
		esbuildOptions: {
			target: 'esnext'
		}
	},
}

export default {
	...commonConfig,
	build: {
		assetsDir: '.',
		sourcemap: 'hidden',
		target: 'esnext',
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
}
