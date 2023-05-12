import { DOM, Directive } from '../type'
import { toFunction } from '../util'
import cModel from './c-model'

type D = Directive | void

export const lastValue = Symbol('lastValue')

export default [cModel, ({ name, value, ownerElement: el }: Attr): D => {
	if (name == 'c-if') {
		const func = toFunction('return ' + value)
		const directive: Directive = {
			deps: new Set,
			f(el) {
				const parent = el.parentElement!
				const anchor = new Comment
				parent.insertBefore(anchor, el);
				(directive.f = function (el) {
					const val = func.call(this, el)
					if (val != el[lastValue]) {
						el[lastValue] = val
						if (val) {
							this.mount?.(el)
							if (!el.isConnected)
								anchor.replaceWith(el)
						} else {
							this.unmount?.(el)
							el.replaceWith(anchor)
						}
					}
				}).call(this, el)
			}
		}
		return directive
	}

	if (name == 'c-show') {
		const func = toFunction('return ' + value),
			initial = (<DOM>el).style.display
		return {
			deps: new Set,
			f(el: DOM) {
				el.style.display = func.call(this, el) ? initial : 'none'
			}
		}
	}

	if (name == 'c-cloak')
		return {
			keep: true,
			f(el) {
				el.removeAttribute(name)
			}
		}

	if (name == 'c-tp')
		return {
			f(el: HTMLTemplateElement) {
				if (import.meta.env.DEV && el.tagName != 'TEMPLATE') {
					console.warn('c-tp can only be used on <template> element')
					return
				}
				const target: Element | null = value && (value in this ? this[value] :
					(<ParentNode>el.getRootNode()).querySelector(value))
				if (target) {
					target.appendChild(el.content)
					el.remove()
				} else
					el.replaceWith(el.content)
			}
		}
}]