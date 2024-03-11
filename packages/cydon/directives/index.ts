import { Cydon, setData } from '../core'
import { Data, DataHandler, Directive, DirectiveHandler, Part, Results } from '../type'
import { toFunction } from '../util'
import event from './event'

type Context = Cydon & Data
type D = Directive | void

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Results & { e?: string[] }) {
	if (import.meta.env.DEV && el.tagName != 'TEMPLATE') {
		console.warn('c-for can only be used on <template> element')
		return
	}
	const [value, key, index] = results.e!
	const data = cydon.$data
	let arr = data[value]
	if (!Array.isArray(arr)) {
		import.meta.env.DEV && console.warn(`c-for: '${value}' is not an array`)
		return
	}
	const parent = el.parentNode!
	const content = el.content
	const count = content.childNodes.length
	el.remove()

	const ph: DataHandler = {
		set: (obj, p: string, val) => {
			obj[p] = val
			cydon.updateValue(key)
			cydon.updateValue(value)
			return true
		}
	}

	const ctxs: Context[] = []
	const render = (i: number) => {
		const c = ctxs[i],
			item = arr[i]
		if (typeof item == 'object') {
			if (c[key])
				Object.assign(c[key], item) // update data
			else
				c[key] = new Proxy({ ...item }, ph)
		} else {
			c[key] = item
			cydon.updateValue(key)
			cydon.updateValue(value)
		}
	}
	/**
	 * Sets the capacity of the parent element to display the given number of items.
	 * If capacity > the current number of items, new elements are created and added to the parent.
	 * If capacity < the current number of items, excess elements are removed from the parent.
	 * If capacity = 0, all elements are removed from the parent.
	 * @param n The desired capacity of the parent element.
	 */
	const setCapacity = (n: number) => {
		if (n) {
			let i = parent.childNodes.length / count | 0
			for (; i < n; ++i) {
				const target = <DocumentFragment>document.importNode(content, true)
				const c: Context = ctxs[i] = Object.create(cydon)
				setData(c, c, data)
				if (index)
					c[index] = i
				render(i)
				c.bind(results, target)
				parent.appendChild(target)
			}
			if (i > n) {
				for (i = (i - n) * count; i--;)
					parent.lastChild!.remove()
				requestIdleCallback(() => cydon.unmount(null))
			}
		} else { // clear
			parent.textContent = ''
			requestIdleCallback(() => cydon.unmount(null))
		}
		ctxs.length = n
	}

	const handler: ProxyHandler<any> = {
		get: (obj, p) => typeof p == 'string' && +p == <any>p &&
			ctxs[<any>p]?.[key] || obj[p],
		set(obj, p, val) {
			if (p == 'length')
				setCapacity(obj.length = +val)
			else {
				obj[p] = val
				if (typeof p == 'string') {
					const n = +p
					if (n == <any>p) {
						if (n >= ctxs.length)
							setCapacity(n + 1)
						else
							render(n)
					}
				}
			}
			cydon.updateValue(value)
			return true
		}
	}
	let items = new Proxy(arr, handler)
	Object.defineProperty(cydon, value, {
		get: () => items,
		set(v) {
			if (v != items) {
				const len = Math.min(arr.length, v.length)
				arr = v
				for (let i = 0; i < len; i++) {
					if (items[i] != v[i])
						render(i)
				}
				items = new Proxy(arr, handler)
				items.length = v.length
			}
		},
		configurable: true
	})

	setCapacity(arr.length)
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

declare module globalThis {
	const CYDON_NO_EXTRA: boolean | undefined
}

import extra from './extra'

if (!globalThis.CYDON_NO_EXTRA)
	directives.push(...extra)