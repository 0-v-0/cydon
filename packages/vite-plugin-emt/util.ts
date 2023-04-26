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

export const inlineStylus = (options?: RenderOptions): Plugin => ({
	name: 'inline-stylus',
	transformIndexHtml: html =>
		html.replace(/(<style[^>]*)\slang=(?:"styl"|'styl')([^>]*?>)(.*?)(?=<\/style>)/gs,
			(_, a, b, s) => a + b + render(s, options!))
})

export const inlineTS = (options?: EsbuildTransformOptions): Plugin => ({
	name: 'inline-ts',
	transform(code, id) {
		if (id.includes('html-proxy&') && id.endsWith('.js'))
			return transformWithEsbuild(code, id.slice(0, -3) + '.ts', options)
		return
	}
})