import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const normalizeIndent = (content: string) =>
	content
		.replace(/^( {4})+/gm, (match) => '\t'.repeat(match.length / 4))
		.replace(/\t ?(\t[^\[])/g, '$1')

export default defineConfig({
	build: {
		lib: {
			entry: {
				cydon: 'index.ts',
				events: 'events.ts',
				// the progressive-enhancement walker imports Cydon from the main
				// bundle: externalize it so dist/declarative.js stays a thin
				// wrapper importing ./cydon.js instead of duplicating the core
				declarative: 'directives/c-data.ts',
			},
			formats: ['es'],
			name: 'Cydon',
		},
		rolldownOptions: {
			// externalize the core only for the declarative walker's import: the
			// cydon entry must keep core bundled, or cydon.js would import a
			// nonexistent dist/core
			external: (id: string, parentId: string | undefined) =>
				id === '../core' && !!parentId?.endsWith('c-data.ts'),
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
		{
			// rolldown emits the external core import with the raw relative
			// specifier; remap it so dist/declarative.js resolves next to cydon.js
			name: 'remap-declarative-core',
			renderChunk(code, chunk) {
				if (chunk.fileName === 'declarative.js')
					return code.replace('"./core"', '"./cydon.js"')
				return null
			},
		},
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
