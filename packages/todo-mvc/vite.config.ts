import { defineConfig } from 'vite'
import emt from 'vite-plugin-ustyle'

export default defineConfig({
	root: '.',
	define: {
		'globalThis.CYDON_NO_UNBIND': 'true'
	},
	optimizeDeps: {
		include: ['cydon'],
		esbuildOptions: {
			target: 'esnext'
		}
	},
	build: {
		assetsDir: '.',
		sourcemap: 'hidden',
		target: 'esnext'
	},
	plugins: [
		emt()
	]
})
