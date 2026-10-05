import { defineConfig, type UserConfig } from 'vite'

// The IIFE build stamps from the main entry (index.ts), which intentionally
// does not re-export the events API — see the comment there. Types are built
// by the main config (vite.config.ts). Build with:
//   vite build --config vite.iife.ts [--mode declarative]

const shared: UserConfig['build'] = {
	target: 'esnext',
	minify: 'terser',
	terserOptions: {
		ecma: 2020,
		compress: {
			ecma: 2020,
			unsafe: true,
		},
	},
	// keep the artifacts built by the other configs
	emptyOutDir: false,
}

const iife = (entry: string, name: string, file: string, externalCore = false): UserConfig => ({
	build: {
		lib: {
			entry,
			formats: ['iife'],
			name,
			fileName: file,
		},
		// the declarative walker imports Cydon: externalize the core so it
		// resolves to the Cydon global set by the main bundle instead of being
		// bundled twice
		rolldownOptions: externalCore
			? {
					external: (id: string) => id === '../core',
					output: {
						// map the externalized core onto the global the main bundle
						// defines. The function form is required: by output time the
						// id has been resolved to an absolute path, so a
						// `{ '../core': 'Cydon' }` record never matches and rolldown
						// falls back to guessing `core`, which is undefined at runtime
						globals: (id: string) =>
							/(^|[/\\])core(\.[cm]?[jt]s)?$/.test(id) ? 'Cydon' : id,
					},
				}
			: undefined,
		...shared,
		},
	})

export default defineConfig(({ mode }) =>
	mode === 'declarative'
		? iife('directives/c-data.ts', 'cydonDeclarative', 'declarative', true)
		: iife('index.ts', 'Cydon', 'cydon'),
)
