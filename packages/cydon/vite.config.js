import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['iife'],
			fileName: 'index',
			name: 'cydon'
		},
		rollupOptions: {
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
