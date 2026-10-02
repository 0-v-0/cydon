import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const normalizeIndent = (content: string) =>
	content
		.replace(/^( {4})+/gm, (match) => '\t'.repeat(match.length / 4))
		.replace(/\t ?(\t[^\[])/g, '$1')

export default defineConfig({
	build: {
		lib: {
			entry: 'index.ts',
			formats: ['es', 'iife'],
			name: 'Cydon',
		},
		target: 'esnext',
		minify: 'terser',
		terserOptions: {
			ecma: 2020,
			compress: {
				ecma: 2020,
				unsafe: true,
			},
		},
	},
	plugins: [
		dts({
			strictOutput: false,
			// The package tsconfig has no `include`, so the plugin defaults to the
			// whole program (vite.config.ts, tests, et al.) — this can lead to a very
			// large output if not restricted. Restricting to library sources
			// leaves only types reachable from the entry.
			include: ['*.ts', 'directives/**/*.ts'],
			exclude: ['vite.config.ts'],
			bundleTypes: {
				extractorConfig: {
					newlineKind: 'lf',
				},
			},
			beforeWriteFile(filePath, content) {
				return {
					filePath,
					content: normalizeIndent(content),
				}
			},
		}),
	],
})
