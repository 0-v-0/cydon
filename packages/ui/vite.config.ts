import CleanCSS, { OptionsPromise } from 'clean-css'
import progress from 'vite-plugin-progress'
import { presetAttributify, presetWind4 } from 'unocss'
import directives from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import { vite as emt } from 'unplugin-emt-styl'
import { vite as styl } from 'unplugin-emt-styl/styl'
import { BuildOptions, defineConfig } from 'vite'

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
				unsafe: true
			}
		}
	}

	const transformers = [directives({ applyVariable: false })]
	if (!dev)
		transformers.push(cleanCSS())
	const plugins = [
		emt(),
		styl(),
		Unocss({
			mode: 'shadow-dom',
			preflights: [],
			presets: [
				presetAttributify(),
				presetWind4()
			],
			transformers
		}),
		progress()
	]
	return {
		optimizeDeps: {
			include: ['cydon'],
			esbuildOptions: {
				target: 'esnext'
			}
		},
		build,
		plugins,
		test: {
			browser: {
				enabled: true,
				headless: true,
				name: 'chromium',
				provider: 'playwright'
			},
			dangerouslyIgnoreUnhandledErrors: true,
			maxConcurrency: 1,
		}
	}
})