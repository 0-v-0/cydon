import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
