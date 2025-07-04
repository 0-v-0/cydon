import { vite as emt, render } from 'unplugin-emt-styl'
import { vite as styl, compileStylusInHtml } from 'unplugin-emt-styl/styl'
import { defineConfig } from 'vite'
import { inlineTS } from './ts'

export default defineConfig({
	define: {
		'globalThis.CYDON_NO_TOGGLE': 'true'
	},
	optimizeDeps: {
		include: ['cydon'],
	},
	build: {
		assetsDir: '.',
		modulePreload: false,
		sourcemap: 'hidden',
		target: 'esnext'
	},
	plugins: [
		emt({
			render: (str, data, maxDepth) => {
				return compileStylusInHtml()(render(str, data, maxDepth).replace(/\.emt/g, ".html"))
			},
		}),
		styl(),
		inlineTS()
	]
})
