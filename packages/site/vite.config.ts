import directives from '@unocss/transformer-directives'
import { presetAttributify, presetMini } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisy'
import Unocss from 'unocss/vite'
import { vite as emt } from 'unplugin-emt-styl'
import { vite as styl } from 'unplugin-emt-styl/styl'
import { BuildOptions, defineConfig } from 'vite'
import { ViteMinifyPlugin as minify } from 'vite-plugin-minify'

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
		rolldownOptions: {
			input: {
				main: 'src/index.html',
				zh: 'src/index_zh.html',
			},
		},
		modulePreload: {
			polyfill: false,
		},
		target: 'esnext',
	}
	if (!dev) {
		build.minify = 'terser'
		build.terserOptions = {
			ecma: 2020,
			compress: {
				ecma: 2020,
				unsafe: true,
			},
		}
	}
	const plugins = [
		emt({
			paths: ['tpl'],
		}),
		styl(),
		Unocss({
			preflights: [],
			presets: [
				presetAttributify(),
				presetMini({
					dark: 'media',
					preflight: 'on-demand',
					variablePrefix: 'u-',
				}),
				presetDaisy({
					base: false,
					themes: false,
					utils: false,
					rtl: false,
				}),
			],
			transformers: [directives({ applyVariable: false })],
		}),
		removeCrossorigin(),
	]
	if (!dev)
		plugins.push(
			minify({
				removeAttributeQuotes: true,
			}),
		)
	return {
		base: './',
		root: 'src',
		build,
		optimizeDeps: {
			include: ['cydon'],
		},
		plugins,
	}
})
