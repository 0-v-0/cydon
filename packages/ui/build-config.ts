//import autoprefixer from 'autoprefixer'
import CleanCSS, { OptionsPromise } from 'clean-css'
// import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import emt, { inlineStylus, inlineTS } from 'vite-plugin-ustyle'
import { commonConfig } from './vite.config'

type MagicString = {
	overwrite(start: number, end: number, content: string): void
	length(): number
}

const cleanCSS = (options?: OptionsPromise) => {
	const cleanCSS = new CleanCSS({
		...options,
		returnPromise: true
	})
	return {
		name: 'clean-css',
		enforce: <const>'post',
		idFilter: (id: string) => id.endsWith('.css'),
		async transform(code: MagicString) {
			code.overwrite(0, code.length(), (await cleanCSS.minify(code + '')).styles)
		}
	}
}

export default {
	...commonConfig,
	build: {
		assetsDir: '.',
		minify: <const>'terser',
		sourcemap: 'hidden',
		target: 'esnext',
		terserOptions: {
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
	},
	/*css: {
		postcss: {
			plugins: [<{}>autoprefixer()]
		}
	},*/
	plugins: [
		emt(),
		inlineStylus(),
		inlineTS(),
		Unocss({
			mode: 'shadow-dom',
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno(),
			],
			transformers: [
				cleanCSS(),
				transformerDirective({ varStyle: false })
			]
		}),
		// Inspect(),
		progress
	]
}