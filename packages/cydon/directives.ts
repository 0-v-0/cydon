import { Cydon } from './core'
import { Data, Directive, DirectiveHandler, DOM, Part, Results } from './type'
import { getFunc } from './util'

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Results, [value, key, index]: string[]) {
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
	const newScope = !cydon._parent
	cydon._deps = new Set<string>()

	const onUpdate = (prop: string) => cydon.updateValue(prop)
	const ctxs: (Cydon & Data)[] = []
	const render = (i: number) => {
		const c = ctxs[i],
			item = arr[i]
		if (c[key])
			Object.assign(c[key], item) // update data
		else
			c[key] = new Proxy({ ...item }, {
				set: (obj, p: string, val) => {
					obj[p] = val
					c.updateValue(key)
					c.updateValue(value)
					return true
				}
			})
	}
	const setCapacity = (n: number) => {
		if (n) {
			let i = parent.childNodes.length / count | 0
			for (; i < n; ++i) {
				const target = <DocumentFragment>content.cloneNode(true)
				const c: Cydon & Data = ctxs[i] = Object.create(cydon)
				if (newScope) {
					c._dirty = new Set
					c._targets = []
					c.onUpdate = onUpdate
				}
				c.setData(c, data)
				if (index)
					c[index] = i
				render(i)
				c.bind(results, target)
				parent.appendChild(target)
			}
			for (i = (i - n) * count; i--;)
				parent.lastChild!.remove()
		} else // clear
			parent.textContent = ''
		ctxs.length = n
	}

	const handler: ProxyHandler<any> = {
		get: (obj, p) => typeof p == 'string' && +p == <any>p &&
			ctxs[<any>p]?.[key] || obj[p],
		set: (obj, p, val) => {
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
				const oldLen = arr.length
				items = new Proxy(arr = v, handler)
				for (let i = 0; i < oldLen; i++)
					render(i)
				items.length = v.length
			}
		}
	})

	if (newScope)
		cydon.onUpdate = (prop: string) => {
			if (cydon._deps!.has(prop))
				for (const c of ctxs) {
					c._dirty.add(prop)
					c.commit()
				}
		}
	setCapacity(arr.length)
}

type D = Directive | void

const boundElements = new Map<string, WeakSet<Element>>()
const listenedElements = new Map<string, WeakSet<EventTarget>>()
const handlers = new Map<string, symbol>()

declare global {
	interface Node {
		[x: symbol]: any
	}
}

const listener = (e: Event) => {
	const key = handlers.get(e.type)
	if (key)
		for (let target = e.target; target instanceof Node; target = target.parentNode) {
			const handler = target[key]
			if (handler) {
				handler(e)
				break
			}
		}
}

export const directives: DirectiveHandler[] = [
	({ name, value }): D => {
		if (name == 'c-if') {
			const func = getFunc('return ' + value)
			const data: Directive = {
				deps: new Set,
				f(el) {
					const parent = el.parentElement!
					const anchor = new Text
					parent.insertBefore(anchor, el)
					let lastValue: boolean
					data.f = function (el) {
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
	}, ({ name, value, ownerElement: el }, _, parent): D => {
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
				f(el) {
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
			let key: symbol | undefined
			if (parent && name[0] != '$') { // delegate to root node of parent
				key = handlers.get(name)
				if (!key)
					handlers.set(name, key = Symbol())
				let set = listenedElements.get(name)
				if (!set)
					listenedElements.set(name, set = new WeakSet)
				const root = parent.getRootNode()
				if (!set.has(root)) {
					root.addEventListener(name, listener, options)
					set.add(root)
				}
			}
			return {
				f(el) {
					const handler = (this[value] ?? getFunc(value)).bind(this)
					if (key)
						el[key] = handler
					else {
						if (name[0] == '$')
							name = this[name.slice(1)] // dynamic event name
						el.addEventListener(name, handler, options)
					}
				}
			}
		}
	}, ({ name, value }): D => {
		if (name == '@click.away') {
			const func: Function = getFunc(value)
			return {
				f(el) {
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
				f(el) {
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
					f: getFunc(value)
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
			let attr = map.get(name)
			if (!attr)
				map.set(name, attr = <Part>{ deps: new Set })
			attr.f = getFunc(code +
				`if($v!=$e.getAttribute("${name}"))$e.setAttribute("${name}",$v)`)
		}
	}, ({ name, value }): D => {
		if (name[0] == '$') {
			name = name.slice(1)
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
	}, ({ name, value, ownerElement: el }): D => {
		if (name == 'c-show') {
			const func = getFunc('return ' + value),
				initial = (<DOM>el).style.display
			return {
				deps: new Set,
				f(el) {
					(<DOM>el).style.display = func.call(this, el) ? initial : 'none'
				}
			}
		}
	}, ({ name }): D => {
		if (name == 'c-cloak')
			return {
				keep: true,
				f(el) {
					el.removeAttribute(name)
				}
			}
	}
]