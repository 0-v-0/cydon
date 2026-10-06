import { DOM, Directive, DirectiveHandler } from '../type'
import { toFunction } from '../util'
import cModel from './c-model'

type D = Directive | void

export const lastValue = Symbol(import.meta.env.DEV ? 'cydon:lastValue' : '')
const ifAnchor = Symbol(import.meta.env.DEV ? 'cydon:ifAnchor' : '')

export default <DirectiveHandler[]>[cModel, (name, value, el): D => {
	if (name == 'c-if') {
		const func = toFunction('return ' + value)
		return {
			deps: new Set,
			// stateless on purpose: a c-for loop binds clones of one compiled
			// template with the same Part, so per-item state (the anchor) has
			// to live on the element, not in this closure
			f(el) {
				// the anchor is created once, next to the element; replaceWith
				// keeps the pair adjacent afterwards. parentNode, not
				// parentElement: bind runs while a c-for item is still a child
				// of its DocumentFragment, whose parentNode is the fragment —
				// parentElement would be null there
				let anchor = el[ifAnchor]
				if (!anchor) {
					el[ifAnchor] = anchor = new Comment
					el.parentNode!.insertBefore(anchor, el)
				}
				const val = func.call(this, el)
				if (val != el[lastValue]) {
					el[lastValue] = val
					// the subtree keeps its bindings while hidden: mount() could
					// not rebind it scope-correctly inside a c-for item anyway,
					// and unmount(el) would drop the c-if target itself (a node
					// contains itself), freezing the directive after one toggle
					if (val) {
						if (!el.isConnected)
							anchor.replaceWith(el)
					} else {
						el.replaceWith(anchor)
					}
				}
			}
		}
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
				const target: Element | null | "" = value && (value in this ? this[value] :
					(<ParentNode>el.getRootNode()).querySelector(value))
				// Defer moving the content until after bind: removing or expanding the
				// template mid-walk shifts the sibling indices recorded by compile(),
				// the same reason c-for defers removing its template.
				queueMicrotask(() => {
					if (target) {
						target.appendChild(el.content)
						el.remove()
					} else
						el.replaceWith(el.content)
				})
			}
		}
}]