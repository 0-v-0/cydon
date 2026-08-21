import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const normalizeIndent = (content: string) =>
	content
		.replace(/^( {4})+/gm, (match) => '\t'.repeat(match.length / 4))
		.replace(/\t ?(\t[^\[])/g, '$1')

const terserOptions = {
	ecma: 2020,
	compress: {
		ecma: 2020,
		unsafe: true,
	},
}

export default defineConfig([
	{
		build: {
			lib: {
				entry: 'index.ts',
				formats: ['es', 'iife'],
				name: 'Cydon',
			},
			target: 'esnext',
			minify: 'terser',
			terserOptions,
			emptyOutDir: true,
		},
		plugins: [
			dts({
				strictOutput: false,
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
	},
	{
		build: {
			lib: {
				entry: 'declarative.ts',
				formats: ['es'],
				fileName: 'declarative',
			},
			target: 'esnext',
			minify: 'terser',
			terserOptions,
			emptyOutDir: false,
		},
	},
])
