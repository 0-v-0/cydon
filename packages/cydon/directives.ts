import { Cydon } from './core'
import { Data, Directive, DirectiveHandler, DOM, Part, Result } from './type'
import { getFunc } from './util'

function render(c: Cydon & Data, key: string, value: string, item: Data) {
	if (!c[key])
		c[key] = new Proxy({ ...item }, {
			set: (obj, p: string, val) => {
				obj[p] = val
				c.updateValue(key)
				c.updateValue(value)
				return true
			}
		})
	else // update data
		Object.assign(c[key], item)
}

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Result[], [value, key, index]: string[]) {
	const data = cydon.$data
	let arr = data[value]
	if (!Array.isArray(arr)) {
		import.meta.env.DEV && console.warn(`c-for: '${value}' is not an array`)
		return
	}
	const parent = el.parentElement!
	const content = el.content
	const count = content.childNodes.length
	el.remove()
	const list = parent.children
	const setCapacity = (n: number) => {
		if (n) {
			let i = list.length / count | 0
			for (; i < n; ++i) {
				const target = <DocumentFragment>content.cloneNode(true)
				const c: Cydon & Data = ctxs[i] = Object.create(cydon)
				c.setData(c, data)
				if (index)
					c[index] = i
				c.bind(results, target)
				render(c, key, value, arr[i])
				parent.appendChild(target)
			}
			if (i > n)
				setTimeout(() => cydon.unmount(null))
			for (n *= count; i-- > n;)
				parent.lastChild!.remove()
		} else {// clear
			parent.textContent = ''
			setTimeout(() => cydon.unmount(null))
		}
		ctxs.length = n
	}

	const ctxs: (Cydon & Data)[] = []

	const handler: ProxyHandler<any> = {
		get: (obj: any, p) => typeof p == 'string' && +p == <any>p &&
			ctxs[<any>p]?.[key] || obj[p],
		set: (obj: any, p, val) => {
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
							render(ctxs[n], key, value, val)
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
				let oldLen = arr.length
				for (let i = 0; i < oldLen; i++)
					render(ctxs[i], key, value, v[i])
				items = new Proxy(arr = v, handler)
				items.length = v.length
			}
		}
	})

	setCapacity(arr.length)
}

type D = Directive | void
type Handler = EventListenerObject & AddEventListenerOptions

const boundElements = new Map<string, WeakSet<Element>>()
const listenedElements = new Map<string, WeakSet<EventTarget>>()
const delegatedElements = new Map<string, WeakMap<EventTarget, Handler>>()

const listener = (e: Event) => {
	delegatedElements.get(e.type)!.get(e.target!)?.handleEvent(e)
}

export const directives: DirectiveHandler[] = [
	({ name, value }): D => {
		if (name == 'c-if') {
			const func = getFunc('return ' + value)
			const data: Directive = {
				deps: new Set,
				func(el) {
					const parent = el.parentElement!
					const anchor = new Text()
					parent.insertBefore(anchor, el)
					let lastValue: boolean
					data.func = function (el) {
						const val = func.call(this, el)
						if (val != lastValue) {
							lastValue = val
							if (val) {
								this.mount(el)
								if (!el.isConnected)
									parent.insertBefore(el, anchor)
							} else {
								this.unmount(el)
								el.remove()
							}
						}
					}
				}
			}
			return data
		}
	}, ({ name, value, ownerElement: el }): D => {
		if (name == 'c-model' || name == 'c-model.lazy') {
			value = value.trim()
			type Input = HTMLInputElement

			const isCheckbox = (<Input>el).type == 'checkbox'
			const isRadio = (<Input>el).type == 'radio'
			const isSelect = el.tagName == 'SELECT'
			const event = name != 'c-model' || isSelect || isCheckbox ? 'change' : 'input'
			let set = boundElements.get(event)
			if (!set)
				boundElements.set(event, set = new WeakSet)
			const getter = getFunc('return ' + value)
			const setter = Function('$e', '$val', `with(this)${value}=$val`)
			return {
				deps: new Set,
				func(el: Element & Data) {
					if (!set!.has(el)) {
						el.addEventListener(event, () => {
							const newVal = isSelect && (<HTMLSelectElement>el).multiple ?
								[...(<HTMLSelectElement>el).selectedOptions].map(
									option => option.value || option.text) :
								isCheckbox ?
									(<Input>el).checked :
									(<Input>el).value
							setter.call(this, el, newVal)
						})
						set!.add(el)
					}
					// Two-way binding
					const val = getter.call(this, el)
					if (isRadio)
						(<Input>el).checked = val == (<Input>el).value
					else if (isCheckbox)
						(<Input>el).checked = val
					else
						(<Input>el).value = val
				}
			}
		}
		// bind event
		if (name[0] == '@') {
			const arr = name.slice(1).split('.')
			const modifiers = new Set(arr.slice(1))
			const options = {
				capture: modifiers.has('capture'),
				once: modifiers.has('once'),
				passive: modifiers.has('passive')
			}
			name = arr[0]
			return {
				func(el) {
					if (name[0] == '$')
						name = this[name.slice(1)] // dynamic event name
					if (import.meta.env.eventDelegate) {
						const handler = Object.create(options)
						handler.handleEvent = this[value]?.bind?.(this) ?? getFunc(value).bind(this, el)
						let set = listenedElements.get(name)
						if (!set)
							listenedElements.set(name, set = new WeakSet)
						const root = el.getRootNode()
						if (!set.has(root)) {
							root.addEventListener(name, listener, handler)
							set.add(root)
						}
						let map = delegatedElements.get(name)
						if (!map)
							delegatedElements.set(name, map = new WeakMap)
						map.set(el, handler)
					} else
						el.addEventListener(name,
							this[value]?.bind?.(this) ?? getFunc(value).bind(this, el), options)
				}
			}
		}
	}, ({ name, value }): D => {
		if (name == '@click.away') {
			const func: Function = getFunc(value)
			return {
				func(el) {
					el.addEventListener('click', e => {
						if (e.target != el && !el.contains(<Node>e.target))
							func.call(this, e)
					})
				}
			}
		}
	}, ({ name, value }): D => {
		if (name == 'ref') {
			return {
				func(el) {
					if (import.meta.env.DEV && value in this.$data)
						console.warn(`The ref "${value}" has already defined on`, this.$data)
					this.$data[value] = el
				}
			}
		}

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
	}, ({ name, value, ownerElement: el }, map): D => {
		if (name[0] == ':') {
			name = name.substring(1)
			if (!name)
				return {
					deps: new Set,
					func: getFunc(value)
				}

			if (!el.hasAttribute(name))
				el.setAttribute(name, '')
			el.removeAttribute(':' + name)
			let code = `let $v="${el.getAttribute(name)}";`
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
			if (!map.get(name))
				map.set(name, <Part>{ deps: new Set })
			const attr = map.get(name)!
			attr.func = getFunc(code + `if($v!=$e.getAttribute("${name}"))$e.setAttribute("${name}",$v)`)
		}
	}, ({ name, value }): D => {
		if (name[0] == '$') {
			name = name.slice(1)
			let attrName: string
			return {
				deps: new Set,
				func(el) {
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
	}, ({ name, value, ownerElement: el }): D => {
		if (name == 'c-show') {
			const func = getFunc('return ' + value),
				initial = (<DOM>el).style.display
			return {
				deps: new Set,
				func(el) {
					(<DOM>el).style.display = func.call(this, el) ? initial : 'none'
				}
			}
		}
	}, ({ name }): D => {
		if (name == 'c-cloak')
			return {
				keep: true,
				func(el) {
					el.removeAttribute(name)
				}
			}
	}
]