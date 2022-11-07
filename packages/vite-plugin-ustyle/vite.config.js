import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: s => !s.includes('vite-plugin-ustyle'),
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
