import MagicString from 'magic-string'
import { posix } from 'path'
import colors from 'picocolors'
import { RenderOptions, render } from 'stylus'
import { EsbuildTransformOptions, Plugin, ViteDevServer, transformWithEsbuild } from 'vite'

// https://github.com/vitejs/vite/blob/03b323d39cafe2baabef74e6051a9640add82590/packages/vite/src/node/server/hmr.ts
const getShortName = (file: string, root: string) =>
	file.startsWith(root + '/') ? posix.relative(root, file) : file

export const logger = (server: ViteDevServer, file: string) => server.config.logger.info(
	colors.green(`page reload `) + colors.dim(getShortName(file, server.config.root)),
	{ clear: true, timestamp: true }
)

export interface StylusOption extends RenderOptions {
	literal?: string
}

export const inlineStylus = (options?: StylusOption): Plugin => {
	const literal = options?.literal ?? 'styl'
	return {
		name: 'inline-stylus',
		transformIndexHtml: html =>
			html.replace(/(<style[^>]*)\slang=(?:"styl"|'styl')([^>]*?>)(.*?)(?=<\/style>)/gs,
				(_, a, b, s) => a + b + render(s, options!)),
		// parse styl`...`
		transform(code, id) {
			if (literal && (id.endsWith('.js') || id.endsWith('.ts'))) {
				const ms = new MagicString(code)
				return {
					code: ms.replace(new RegExp('\\b' + literal + '\\s*`(.*?)(?<!\\\\)`', 'gs'),
						(_, s) => '`' + render(s, options!) + '`').toString(),
					map: ms.generateMap({ source: id })
				}
			}
			return
		}
	}
}

export const inlineTS = (options?: EsbuildTransformOptions): Plugin => ({
	name: 'inline-ts',
	transform(code, id) {
		if (id.includes('html-proxy&') && id.endsWith('.js'))
			return transformWithEsbuild(code, id.slice(0, -3) + '.ts', options)
		return
	}
})