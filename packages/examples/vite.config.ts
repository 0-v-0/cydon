import { defineConfig } from 'vite'
import emt, { inlineStylus, inlineTS } from 'vite-plugin-ustyle'

export default defineConfig({
	define: {
		'globalThis.CYDON_NO_TOGGLE': 'true'
	},
	optimizeDeps: {
		include: ['cydon'],
		esbuildOptions: {
			target: 'esnext'
		}
	},
	build: {
		assetsDir: '.',
		modulePreload: false,
		sourcemap: 'hidden',
		target: 'esnext'
	},
	plugins: [
		emt(),
		inlineStylus(),
		inlineTS()
	]
})
