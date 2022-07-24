import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: ['@ygoe/msgpack', 'cydon/events', 'idb'],
			output: { sourcemap: 'hidden' }
		},
		target: 'esnext'
	}
})
