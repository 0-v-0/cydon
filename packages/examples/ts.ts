import { OxcOptions, Plugin, transformWithOxc } from 'vite'
import { basename } from 'path'

export const inlineTS = (options?: OxcOptions): Plugin => ({
	name: 'inline-ts',
	transform(code, id) {
		if (id.includes('html-proxy&') && id.endsWith('.js')) {
			// TODO: support tsconfig.json
			return transformWithOxc(code,
				basename(id.replace(/\?.+/, '')) + '.ts', {
				decorator: {
					legacy: true
				},
				...options,
			})
		}
		return
	}
})