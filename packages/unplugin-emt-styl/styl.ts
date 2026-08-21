import MagicString from 'magic-string'
import { RenderOptions, render } from 'stylus'
import {
	createEsbuildPlugin,
	createFarmPlugin,
	createRollupPlugin,
	createRspackPlugin,
	createVitePlugin,
	UnpluginFactory,
} from 'unplugin'

/** Plugin options. Inherits all Stylus {@link RenderOptions} and adds: */
export interface Options extends RenderOptions {
	/** Tagged template literal name for inline Stylus. @default 'styl' */
	literal?: string
}
export type PluginFactory = UnpluginFactory<Options | undefined>

const inlineStylus: PluginFactory = (options?: Options) => {
	const literal = options?.literal ?? 'styl'
	return {
		name: 'inline-stylus',
		enforce: 'pre',
		vite: {
			transformIndexHtml: compileStylusInHtml(options),
		},
		transform(code, id) {
			// parse styl`...`
			if (literal && (id.endsWith('.js') || id.endsWith('.ts'))) {
				const ms = new MagicString(code)
				return {
					code: ms
						.replace(
							new RegExp('\\b' + literal + '\\s*`(.*?)(?<!\\\\)`', 'gs'),
							(_, s) => '`' + render(s, options!) + '`',
						)
						.toString(),
					map: ms.generateMap({ source: id }),
				}
			}
			if (id.includes('&direct') && id.endsWith('.css')) {
				return {
					code: render(code, options!),
				}
			}
			return
		},
	}
}

export default inlineStylus

export const esbuild = createEsbuildPlugin(inlineStylus)
export const farm = createFarmPlugin(inlineStylus)
export const rollup = createRollupPlugin(inlineStylus)
export const rspack = createRspackPlugin(inlineStylus)
export const vite = createVitePlugin(inlineStylus)

export function compileStylusInHtml(options?: Options): (input: string) => string {
	return (html) =>
		html.replace(
			/(<style[^>]*)\slang=(?:"styl"|'styl')([^>]*?>)(.*?)(?=<\/style>)/gs,
			(_, a, b, s) => a + b + render(s, options!),
		)
}
