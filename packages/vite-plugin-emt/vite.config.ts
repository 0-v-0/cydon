import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: ['emmetlite', 'events', 'fs', 'path', 'picocolors', 'readline', 'vite'],
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
