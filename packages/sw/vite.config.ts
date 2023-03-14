import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['iife'],
			name: 'sw',
			fileName: () => 'sw.js'
		},
		rollupOptions: {
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
