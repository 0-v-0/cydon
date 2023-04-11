import { Cydon } from './core'
import { Data, Target } from './type'

const funcCache: Record<string, Function> = Object.create(null)

export const toFunction = (code: string) => <(this: Data, el: Element) => any>
	funcCache[code] || (funcCache[code] = Function('$e', `with(this){${code}}`))

/**
 * defines the decorated class as a custom element.
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const define = (tagName: string, options?: ElementDefinitionOptions) =>
	(target: CustomElementConstructor) => customElements.define(tagName, target, options)

/**
 * run the function immediately while tracking its dependencies reactively,
 * and re-runs it whenever the dependencies are changed.
 * @param cydon cydon instance
 * @param f the function
 * @param node bound node of the cydon instance
 */
export function watch(cydon: Cydon, f: Target['f'], node: Target['node'] = <any>cydon) {
	const target = cydon.bindNode(node, {
		deps: new Set,
		f
	})
	return () => cydon.$targets.delete(target)
}