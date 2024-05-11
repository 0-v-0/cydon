import Inspect from 'vite-plugin-inspect'
import emt, { inlineStylus } from 'vite-plugin-emt'
import { BuildOptions, defineConfig } from 'vite'
import { ViteMinifyPlugin as minify } from 'vite-plugin-minify'
import { presetAttributify, presetMini } from 'unocss'
import directives from '@unocss/transformer-directives'
import Unocss from 'unocss/vite'
import { presetDaisy } from 'unocss-preset-daisy'

function removeCrossorigin() {
	return {
		name: 'remove crossorigin',
		transformIndexHtml(html: string) {
			return html.replace(/ crossorigin/g, '')
		},
	}
}

export default defineConfig(({ mode }) => {
	const dev = mode == 'development'
	const build: BuildOptions = {
		outDir: '../../../docs',
		polyfillModulePreload: false,
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
	const plugins = [
		emt({
			paths: ['tpl'],
			writeHtml: true
		}),
		inlineStylus(),
		Unocss({
			preflights: [],
			presets: [
				presetAttributify(),
				presetMini({
					dark: 'media'
				}),
				presetDaisy()
			],
			transformers: [
				directives({ varStyle: false })
			]
		}),
		removeCrossorigin()
	]
	plugins.push(dev ? Inspect() : minify({
		removeAttributeQuotes: true
	}))
	return {
		base: './',
		root: 'src',
		build,
		optimizeDeps: {
			include: ['cydon'],
			esbuildOptions: {
				target: 'esnext'
			}
		},
		plugins
	}
})