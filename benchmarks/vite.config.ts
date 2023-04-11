import { defineConfig } from 'vite'

export default defineConfig({
	define: {
		'globalThis.CYDON_NO_EXTRA': 'true'
	},
	build: {
		modulePreload: false,
		target: 'esnext',
		minify: 'terser',
		terserOptions: {
			ecma: 2020,
			compress: {
				ecma: 2020,
				passes: 3,
				unsafe: true,
				unsafe_arrows: true,
				unsafe_comps: true,
				unsafe_Function: true,
				unsafe_math: true,
				unsafe_methods: true,
				unsafe_proto: true,
				unsafe_regexp: true,
				unsafe_undefined: true
			}
		}
	}
})
