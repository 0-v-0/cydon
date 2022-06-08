import { Cydon, Data } from '.'

// polyfill from https://github.com/mfreed7/declarative-shadow-dom#feature-detection-and-polyfilling
if (!HTMLTemplateElement.prototype.hasOwnProperty('shadowRoot'))
	document.querySelectorAll('template[shadowroot]').forEach((tpl) => {
		(tpl.parentNode as Element).attachShadow({
			mode: tpl.getAttribute('shadowroot') as ShadowRootMode
		}).appendChild((tpl as HTMLTemplateElement).content)
		tpl.remove()
	})

export type Constructor<T> = {
	new(...args: any[]): T
}

/**
 * defines the decorated class as a custom element.
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const customElement = (tagName: string): ClassDecorator =>
	(target: Function) => customElements.define(tagName, target as Constructor<HTMLElement>)

const readWrite = {
	enumerable: true,
	configurable: true
}

/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * @param cache An optional boolean which when true performs the DOM query only
 * @category Decorator
 */
export const query = (selector: string, cache = true): PropertyDecorator =>
	(target, key) => {
		if (cache)
			(target as CydonElement)[key] = (target as CydonElement).renderRoot.querySelector(selector)
		else
			Object.defineProperty(target, key, {
				get(this: CydonElement) {
					return this.renderRoot.querySelector(selector)
				},
				...readWrite
			})
	}

/**
 * A property decorator that converts a class property into a getter
 * that executes a querySelectorAll on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * @category Decorator
 */
export const queryAll = (selector: string, cache = true): PropertyDecorator =>
	(target, key) => {
		if (cache)
			(target as CydonElement)[key] = (target as CydonElement).renderRoot.querySelectorAll(selector)
		else
			Object.defineProperty(target, key, {
				get(this: CydonElement) {
					return this.renderRoot.querySelectorAll(selector)
				},
				...readWrite
			})
	}

export abstract class CydonElement extends HTMLElement {
	renderRoot: HTMLElement | ShadowRoot
	cydon: Cydon
	data: Data
	[x: string | symbol]: any

	constructor(data?: Data) {
		super()
		this.renderRoot = this.shadowRoot || this
		const cydon = new Cydon(data, this)
		if (this.shadowRoot)
			cydon.bind(this.shadowRoot)
		cydon.bind(this)
		this.data = cydon.data
		this.cydon = cydon
	}
}
