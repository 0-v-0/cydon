import { Cydon, CydonOption, Data } from '.'

// polyfill from https://github.com/mfreed7/declarative-shadow-dom#feature-detection-and-polyfilling
if (!HTMLTemplateElement.prototype.hasOwnProperty('shadowRoot'))
	document.querySelectorAll<HTMLTemplateElement>('template[shadowroot]').forEach(tpl => {
		(<Element>tpl.parentNode).attachShadow({
			mode: <ShadowRootMode>tpl.getAttribute('shadowroot')
		}).appendChild(tpl.content)
		tpl.remove()
	})

export type Constructor<T> = new (...args: any[]) => T

/**
 * defines the decorated class as a custom element.
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const customElement = (tagName: string, options?: ElementDefinitionOptions): ClassDecorator =>
	(target: Function) => customElements.define(tagName, <Constructor<HTMLElement>>target, options)

export interface ReactiveElement extends HTMLElement {
	readonly data: Data
}

/**
 * A utility function for binding an element to Cydon
 *
 * @param el target element
 * @param options options passed to Cydon
 * @returns a Cydon object
 */
export const bind = (el: Element | ShadowRoot, options?: CydonOption) => {
	const cydon = new Cydon({ data: el, methods: <any>el, ...options })
	if ((<Element>el).shadowRoot)
		cydon.bind((<Element>el).shadowRoot!)
	cydon.bind(el)
	return cydon
}