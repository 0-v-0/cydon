import MagicString from 'magic-string'
import { basename, posix } from 'path'
import colors from 'picocolors'
import { RenderOptions, render } from 'stylus'
import { EsbuildTransformOptions as EsbuildOpt, Plugin, ViteDevServer, transformWithEsbuild } from 'vite'

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
		enforce: 'pre',
		transformIndexHtml: transformStylusHtml(options),
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
			if (id.includes('&direct') && id.endsWith('.css')) {
				return {
					code: render(code, options!)
				}
			}
			return
		}
	}
}

export const inlineTS = (options?: EsbuildOpt): Plugin => ({
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

export function transformStylusHtml(options?: StylusOption): ((input: string) => string) {
	return html => html.replace(/(<style[^>]*)\slang=(?:"styl"|'styl')([^>]*?>)(.*?)(?=<\/style>)/gs,
		(_, a, b, s) => a + b + render(s, options!))
}
