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
				const anchor = new Text
				parent.insertBefore(anchor, el);
				(directive.f = function (el) {
					const val = func.call(this, el)
					if (val != el[lastValue]) {
						el[lastValue] = val
						if (val) {
							this.mount?.(el)
							if (!el.isConnected)
								parent.insertBefore(el, anchor)
						} else {
							this.unmount?.(el)
							el.remove()
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
}]