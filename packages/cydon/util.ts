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
export const define = (tagName: string, options?: ElementDefinitionOptions): ClassDecorator =>
	(target: Function) => customElements.define(tagName, <CustomElementConstructor>target, options)

// From https://gist.github.com/zalelion/df185578a456eb855e43f959af71059d
function walk(node: Element, clone: Element) {
	const nodes = node.shadowRoot
	if (nodes) {
		const shadow = clone.attachShadow({ mode: 'open' })
		nodes.childNodes.forEach(c => shadow.append(c.nodeType == 1/*Node.ELEMENT_NODE*/ ?
			cloneNode(<Element>c) : c.cloneNode(true)))
	}
	let n1 = node.firstElementChild!, n2!: Element
	if (n1)
		n2 = clone.firstElementChild!
	while (n1) {
		walk(n1, n2)
		n1 = n1.nextElementSibling!
		n2 = n2.nextElementSibling!
	}
}

/**
 * cloneNode(true), with shadow roots optionally.
 * @param node
 */
export function cloneNode(node: Element, withShadowRoots = true) {
	const clone = node.cloneNode(true)
	if (withShadowRoots)
		walk(node, <Element>clone)
	return clone
}
