import { Cydon, CydonOption, Data as D } from '.'

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
	readonly data: D
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

export const customBind = (el: Element | ShadowRoot, options?: CydonOption) => {
	const cydon = new Cydon({ data: el, methods: <any>el, ...options })
	cydon.$data.bind = () => {
		if ((<Element>el).shadowRoot)
			cydon.bind((<Element>el).shadowRoot!)
		cydon.bind(el)
	}
	return cydon
}

export const mixinData = <T extends {}, Data extends {}>(base: Constructor<T>, data: Data) => {
	const E = class extends (<Constructor<{}>>base) {
		get $data() {
			const obj = <Data>{}
			for (const key in data)
				obj[key] = (<any>this)[key]
			return obj
		}
		constructor(...args: any[]) {
			super(...args)
			Object.assign(this, data)
		}
	}
	return <Constructor<T & Data & { readonly $data: Data }>>E
}