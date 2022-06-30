import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: ['clean-css', 'fs', 'stylus', 'vite-plugin-emt'],
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
