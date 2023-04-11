import CleanCSS, { OptionsPromise } from 'clean-css'
import Inspect from 'vite-plugin-inspect'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetUno } from 'unocss'
import directives from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import { BuildOptions, defineConfig } from 'vite'
import emt, { inlineStylus, inlineTS } from 'vite-plugin-ustyle'

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

export default defineConfig(({ mode }) => {
	const dev = mode == 'development'
	const build: BuildOptions = {
		assetsDir: '.',
		sourcemap: 'hidden',
		target: 'esnext'
	}
	if (!dev) {
		build.minify = 'terser'
		build.terserOptions = {
			ecma: 2020,
			compress: {
				ecma: 2020,
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

	const transformers = [directives({ varStyle: false })]
	if (!dev)
		transformers.push(cleanCSS())
	const plugins = [
		emt(),
		inlineStylus(),
		inlineTS(),
		Unocss({
			mode: 'shadow-dom',
			preflights: [],
			presets: [
				presetAttributify(),
				presetUno()
			],
			transformers
		}),
		progress()
	]
	if (dev)
		plugins.push(Inspect())
	return {
		optimizeDeps: {
			include: ['cydon'],
			esbuildOptions: {
				target: 'esnext'
			}
		},
		build,
		plugins
	}
})