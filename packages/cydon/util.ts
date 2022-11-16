import { Data } from '.'

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

// From https://gist.github.com/zalelion/df185578a456eb855e43f959af71059d
function walk(node: Element, clone: Element) {
	const nodes = node.shadowRoot
	if (nodes) {
		const shadow = clone.attachShadow({ mode: 'open' })
		nodes.childNodes.forEach(c => shadow.append(c.nodeType == 1/*Node.ELEMENT_NODE*/ ?
			cloneWithShadowRoots(<Element>c) : c.cloneNode(true)))
	}
	for (let i = 0; i < node.children.length; i++)
		walk(node.children[i], clone.children[i])
}

/**
 * cloneNode(true), but also clones shadow roots.
 * @param node
 */
export function cloneWithShadowRoots(node: Element) {
	const clone = node.cloneNode(true)
	walk(node, <Element>clone)
	return clone
}

/**
 * query an element in its shadow root (if exists) or its descendants
 * @param el element
 * @param selector
 * @returns element that matches selector
 */
export const query = (el: Element, selector: string) =>
	el.shadowRoot?.querySelector<HTMLElement>(selector) ||
	el.querySelector<HTMLElement>(selector)