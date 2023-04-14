import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: s => !s.includes('vite-plugin-emt') && s[0] != '.'
		},
		target: 'esnext'
	}
})
