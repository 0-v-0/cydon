import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['iife'],
			name: 'sw'
		},
		rollupOptions: {
			output: { sourcemap: 'inline' }
		},
		target: 'esnext'
	}
})
