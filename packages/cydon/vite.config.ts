import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'cydon.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
