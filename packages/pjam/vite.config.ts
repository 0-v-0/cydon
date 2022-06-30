import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: 'cydon/events',
			output: { sourcemap: 'hidden' }
		}
	}
})
