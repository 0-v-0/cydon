import { EsbuildTransformOptions as ETOpt, Plugin, transformWithEsbuild } from 'vite'
import { basename } from 'path'

export const inlineTS = (options?: ETOpt): Plugin => ({
	name: 'inline-ts',
	transform(code, id) {
		if (id.includes('html-proxy&') && id.endsWith('.js')) {
			// TODO: support tsconfig.json
			return transformWithEsbuild(code,
				basename(id.replace(/\?.+/, '')) + '.ts', options)
		}
		return
	}
})