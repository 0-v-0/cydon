import { Data } from './type'

const funcCache: Record<string, Function> = Object.create(null)

export const getFunc = (code: string) => <(this: Data, el: Element) => any>
	funcCache[code] || (funcCache[code] = Function('$e', `with(this){${code}}`))

/**
 * defines the decorated class as a custom element.
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const define = (tagName: string, options?: ElementDefinitionOptions) =>
	(target: CustomElementConstructor) => customElements.define(tagName, target, options)
