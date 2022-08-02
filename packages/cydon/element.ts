import { Cydon, Data } from '.'

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

const descriptor = {
	enumerable: true,
	configurable: true
}

type Cache = {
	[x: symbol]: any
}

/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * @param cache An optional boolean which when true performs the DOM query only
 * @category Decorator
 */
export const query = (selector: string, cache = true) =>
	(target: CydonElement, key: string, symbol = Symbol(key)) => {
		Object.defineProperty(target, key, {
			get(this: CydonElement & Cache) {
				return cache && this[symbol] ?
					this[symbol] :
					this[symbol] = this.renderRoot.querySelector(selector)
			},
			...descriptor
		})
	}

/**
 * A property decorator that converts a class property into a getter
 * that executes a querySelectorAll on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * @category Decorator
 */
export const queryAll = (selector: string, cache = true) =>
	(target: CydonElement, key: string, symbol = Symbol(key)) => {
		Object.defineProperty(target, key, {
			get(this: CydonElement & Cache) {
				return cache && this[symbol] ?
					this[symbol] :
					this[symbol] = this.renderRoot.querySelectorAll(selector)
			},
			...descriptor
		})
	}

export interface ReactiveElement extends HTMLElement {
	readonly data: Data
}

export interface CydonElement extends ReactiveElement {
	renderRoot: HTMLElement | ShadowRoot
	cydon: Cydon
}

interface Ctor<T> extends Constructor<T> {
	new(): T
}

// TODO: Dedupe Mixin. See npm @open-wc/dedupe-mixin
export const CydonElementOf = <T extends HTMLElement>(base: Ctor<T> = <any>HTMLElement) => {
	const CE = class extends (<Ctor<HTMLElement>>base) {
		renderRoot: HTMLElement | ShadowRoot = this.shadowRoot || this
		cydon: Cydon
		get data() {
			return this.cydon.data
		}

		constructor(data?: Data, ...args: any[]) {
			super(...args)
			this.cydon = new Cydon({ data: data || this, methods: <any>this })
		}

		bind() {
			if (this.shadowRoot)
				this.cydon.bind(this.shadowRoot)
			this.cydon.bind(this)
		}
	}
	return <Constructor<T> & typeof CE>CE
}

/**
 * Base element class that manages element properties and attributes.
 */
export const CydonElement = CydonElementOf()