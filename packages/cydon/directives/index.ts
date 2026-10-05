import { Cydon, setData } from '../core'
import { Data, DataHandler, Directive, DirectiveHandler, Part, Results } from '../type'
import { toFunction } from '../util'
import event from './event'
export * from './event'

type Context = Cydon & Data
type D = Directive | void

/**
 * State of one c-for loop instance: its own scopes, capacity and DOM.
 * Everything array-related (the backing array and its proxy) lives on the
 * shared state below — loops over the same array field only own their scopes.
 */
export interface ForLoop {
	ctxs: Context[]
	render(i: number): void
	setCapacity(n: number): void
}

/**
 * Shared state of all c-for loops bound to the same (instance, array field).
 * A single accessor is defined per field name and fans writes out to every
 * registered loop, so two c-fors iterating the same array both stay live
 * instead of the later defineProperty silently replacing the earlier one.
 *
 * Note: direct index reads through the shared proxy (e.g. `${items[0].x}`
 * in an expression) resolve the item scope of the first registered loop.
 */
export interface ForLoops {
	arr: unknown[]
	items: any[]
	loops: ForLoop[]
	setArray(v: unknown[]): void
}

/** Symbol key of the per-instance c-for state table, declared as a Mixin
 * field so it is visible from the Cydon class. A symbol key is not
 * enumerable, so Object.keys/spread/assign on a Cydon instance can't pick it
 * up or clobber it. */
export const forSharedKey = Symbol(import.meta.env.DEV ? 'cydon:forShared' : '')

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Results & { e?: string[] }) {
	if (import.meta.env.DEV && el.tagName != 'TEMPLATE') {
		console.warn('c-for can only be used on <template> element')
		return
	}
	const [value, key, index] = results.e!
	const data = cydon.$data
	const initial = data[value]
	if (!Array.isArray(initial)) {
		if (import.meta.env.DEV)
			console.warn(`c-for: '${value}' is not an array`)
		return
	}
	const parent = el.parentNode!
	const content = el.content
	// Defer removing the template until after bind: sibling indices recorded by
	// compile() must stay valid for the rest of the bind walk, so the template
	// must not leave the DOM while bind is still walking its siblings.
	queueMicrotask(() => el.remove())

	const forMap = cydon[forSharedKey] ??= new Map<string, ForLoops>()
	let shared = forMap.get(value)
	if (!shared) {
		const handler: ProxyHandler<any> = {
			get: (obj, p) => typeof p == 'string' && +p == <any>p &&
				shared!.loops[0]?.ctxs[<any>p]?.$data[key] || obj[p],
			set(obj, p, val) {
				if (p == 'length') {
					obj.length = +val
					for (const l of shared!.loops)
						l.setCapacity(+val)
				} else {
					obj[p] = val
					if (typeof p == 'string' && +p == <any>p) {
						const n = +p
						for (const l of shared!.loops) {
							if (n >= l.ctxs.length)
								l.setCapacity(n + 1)
							else
								l.render(n)
						}
					}
				}
				cydon.updateValue(value)
				return true
			},
		}
		forMap.set(value, shared = {
			arr: initial,
			items: new Proxy(initial, handler),
			loops: [],
			setArray(v) {
				if (v != this.items) {
					const len = Math.min(this.arr.length, v.length)
					this.arr = v
					for (const l of this.loops)
						for (let i = 0; i < len; i++)
							if (l.ctxs[i]?.$data[key] != v[i])
								l.render(i)
					this.items = new Proxy(v, handler)
					this.items.length = v.length
				}
			},
		})
		Object.defineProperty(cydon, value, {
			get: () => shared!.items,
			set: (v) => shared!.setArray(v),
			configurable: true,
		})
	}

	// ---- this loop's private state: scopes, capacity, own-node marks ----
	const ph: DataHandler = {
		set: (obj, p: string, val) => {
			obj[p] = val
			cydon.updateValue(key)
			cydon.updateValue(value)
			return true
		}
	}
	const ctxs: Context[] = []
	const own = Symbol(import.meta.env.DEV ? 'cydon:forOwn' : '')
	let capacity = 0
	const render = (i: number) => {
		const c = ctxs[i],
			item = shared.arr[i]
		if (typeof item == 'object') {
			if (c.$data[key])
				Object.assign(c.$data[key], item) // update data
			else
				c.$data[key] = new Proxy({ ...item }, ph)
		} else {
			c.$data[key] = item
			cydon.updateValue(key)
			cydon.updateValue(value)
		}
	}
	/**
	 * Sets the capacity of the parent element to display the given number of items.
	 * If capacity > the current number of items, new elements are created and added to the parent.
	 * If capacity < the current number of items, excess elements are removed from the parent.
	 * If capacity = 0, all rendered elements are removed from the parent.
	 * Only nodes rendered by this loop are ever removed — static siblings are untouched.
	 * @param n The desired capacity of the parent element.
	 */
	const setCapacity = (n: number) => {
		if (n) {
			for (; capacity < n; ++capacity) {
				// importNode, not cloneNode: the clone is created in the main
				// document, where already-defined custom elements upgrade
				// synchronously — before bind. Cloning in the template content's
				// document (no custom element registry) defers the upgrade to
				// insertion, after bind, so property bindings written by bind
				// would land before the accessors exist and shadow them.
				const target = document.importNode(content, true)
				const c: Context = ctxs[capacity] = Object.create(cydon)
				// the item's data object proto-links to the parent data: the
				// scope chain (item -> outer items -> root data) is then carried
				// by ordinary prototype lookup, in reads and in `with` has checks
				setData(c, Object.create(data), data)
				if (index)
					c.$data[index] = capacity
				render(capacity)
				c.bind(results, target)
				for (let node = target.firstChild; node; node = node.nextSibling)
					node[own] = true
				parent.appendChild(target)
			}
			if (capacity > n) {
				let k = (capacity - n) * content.childNodes.length
				let node = parent.lastChild
				while (node && k > 0) {
					const prev = node.previousSibling
					if (node[own]) {
						node.remove()
						--k
					}
					node = prev
				}
				requestIdleCallback(() => cydon.unmount(null))
				capacity = n
			}
		} else { // clear: remove only the elements rendered by this loop
			let onlyOwn = true
			for (let node = parent.firstChild; node; node = node.nextSibling) {
				if (!node[own] && !(node.nodeType == 3 && !(node as Text).data.trim())) {
					onlyOwn = false
					break
				}
			}
			if (onlyOwn)
				parent.textContent = ''
			else {
				let node = parent.lastChild
				while (node) {
					const prev = node.previousSibling
					if (node[own])
						node.remove()
					node = prev
				}
			}
			requestIdleCallback(() => cydon.unmount(null))
			capacity = 0
		}
		ctxs.length = n
	}

	shared.loops.push({ ctxs, render, setCapacity })
	setCapacity(shared.arr.length)
}

export const directives: DirectiveHandler[] = [
	event,
	(name, value): D => {
		if (name == 'ref')
			return {
				f(el) {
					if (import.meta.env.DEV && value in this.$data)
						console.warn(`The ref "${value}" has already defined on`, this.$data)
					this.$data[value] = el
				}
			}
		if (name[0] == '$') { // dynamic attribute name
			name = name.substring(1)
			let attrName: string
			return {
				deps: new Set,
				f(el) {
					if (attrName) {
						const newName = this.data[name]
						if (newName != attrName) {
							el.removeAttribute(attrName)
							if (newName)
								el.setAttribute(newName, value)
						}
					} else {
						attrName = this.data[name]
						el.setAttribute(attrName, value)
					}
				}
			}
		}
		if (name[0] == '.') { // bind DOM property
			name = name.substring(1)
			const func = toFunction('return ' + value)
			return {
				deps: new Set,
				f(el: Data & Element) {
					el[name] = func.call(this, el)
					el.updateValue?.(name)
				}
			}
		}
	},
	/**
	 * A simple utility for conditionally joining attributes like classNames together
	 *
	 * e.g. :class="a:cond1;b:cond2"
	 * cond1 & cond2 is true:	class="a b"
	 * cond1 is true:			class="a"
	 * cond2 is true:			class="b"
	 * neither is true:			class=""
	 *
	 * NOTE: This differs from Vue
	 */
	(name, value, el, attrs): D => {
		if (name[0] == ':') {
			name = name.substring(1)
			if (!name)
				return {
					deps: new Set,
					f: toFunction(value)
				}

			el.removeAttribute(':' + name)
			let code = `let $v="${el.getAttribute(name) ?? ''}";`
			for (const cls of value.split(';')) {
				let key = cls,
					val = cls
				const p = cls.indexOf(':')
				if (~p) {
					key = cls.substring(0, p)
					val = cls.substring(p + 1)
				}
				code += `if(${val.trim()})$v+=" ${key.trim()}";`
			}
			let attr = attrs.get(name)
			if (!attr)
				attrs.set(name, attr = <Part>{ a: name, deps: new Set })
			attr.f = toFunction(code + `return $v`)
		}
	}
]

declare namespace globalThis {
	// ambient: read back via globalThis.CYDON_NO_EXTRA below and settable from host pages
	// oxlint-disable-next-line no-unused-vars
	const CYDON_NO_EXTRA: boolean | undefined
}

import extra from './extra'

if (!globalThis.CYDON_NO_EXTRA)
	directives.push(...extra)