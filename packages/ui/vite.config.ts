import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import emt, { cleanCSS, inlineStylus } from '@cydon/ustyle'

export default ({ mode }: { mode: string }) => {
	const transformers = [
		inlineStylus(),
		transformerDirective({ varStyle: false })
	]
	let minify = mode == 'production' && <const>'terser',
		terserOptions
	if (minify) {
		transformers.push(cleanCSS())
		terserOptions = {
			ecma: <2020>2020,
			compress: {
				ecma: <2020>2020,
				passes: 3,
				unsafe: true,
				unsafe_arrows: true,
				unsafe_comps: true,
				unsafe_Function: true,
				unsafe_math: true,
				unsafe_methods: true,
				unsafe_proto: true,
				unsafe_regexp: true,
				unsafe_undefined: true
			}
		}
	}
	return {
		root: 'examples',
		define: {
			'globalThis.CYDON_NO_UNBIND': 'true'
		},
		build: {
			assetsDir: '.',
			minify,
			sourcemap: 'hidden',
			target: 'esnext',
			terserOptions
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
				transformers
			}),
			Inspect(),
			progress
		]
	}
}
