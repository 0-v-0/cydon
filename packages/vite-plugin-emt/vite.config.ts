import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: /./,
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	},
	esbuild: {
		banner: 'const self={};',
	}
})