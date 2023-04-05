import { Data } from './type'

const funcCache: Record<string, Function> = Object.create(null)

export const getFunc = (code: string) => <(this: Data, el: Element) => any>
	funcCache[code] || (funcCache[code] = Function('$e', `with(this){${code}}`))

/**
 * defines the decorated class as a custom element.
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const define = (tagName: string, options?: ElementDefinitionOptions): ClassDecorator =>
	(target: Function) => customElements.define(tagName, <CustomElementConstructor>target, options)

// polyfill from https://github.com/mfreed7/declarative-shadow-dom#feature-detection-and-polyfilling
if (!HTMLTemplateElement.prototype.hasOwnProperty('shadowRoot'))
	document.querySelectorAll<HTMLTemplateElement>('template[shadowroot]').forEach(tpl => {
		(<Element>tpl.parentNode).attachShadow({
			mode: <ShadowRootMode>tpl.getAttribute('shadowroot')
		}).appendChild(tpl.content)
		tpl.remove()
	})