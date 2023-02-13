import { Cydon, Directive, directives, Part, Results } from './core'
import { Data, getFunc } from './util'

type D = Directive | void

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Results, [value, key, index]: string[]) {
	const data = cydon.$data
	const arr = data[value]
	if (!Array.isArray(arr)) {
		import.meta.env.DEV && console.warn(`c-for: '${value}' is not an array`)
		return
	}
	const newScope = !cydon.deps
	const parent = el.parentElement!
	const content = el.content
	el.remove()
	const list = <HTMLCollectionOf<HTMLElement>>parent.children
	let len = 0
	const setCapacity = (n: number) => {
		ctxs.length = n
		if (!n) { // clear
			parent.textContent = ''
			len = 0
		}
		for (; len < n; len++) {
			const target = <DocumentFragment>content.cloneNode(true)
			const c: Cydon & Data = ctxs[len] = Object.create(cydon)
			if (newScope) {
				c.queue = new Set()
				c.targets = new Set()
				c.onUpdate = onUpdate
			}
			c.setData(c, data)
			if (index)
				c[index] = len
			c.bind(results, target)
			parent.appendChild(target)
			render(len)
		}
		for (; len > n;)
			list[--len].remove()
		queueMicrotask(newScope ? () => {
			for (let i = 0; i < len; i++)
				ctxs[i].commit()
		} : () => cydon.commit())
	}

	const deps = cydon.deps = new Set<string>()
	const ctxs: (Cydon & Data)[] = []

	const onUpdate = (prop: string) => cydon.updateValue(prop)

	const render = (i: number) => {
		let item = arr[i],
			c = ctxs[i]
		if (!c) {
			setCapacity(i + 1)
			c = ctxs[i]
		}
		if (c[key])
			// if item is undefined, hide the element
			list[i].hidden = item == void 0
		else
			c[key] = new Proxy(item || {}, {
				set: (obj, p: string, val) => {
					obj[p] = val
					c.updateValue(key)
					c.updateValue(value)
					return true
				}
			})

		// update data
		if (item)
			Object.assign(c[key], item)
	}

	let handle = 0
	const items = new Proxy(arr, {
		get: (obj: any, p) => typeof p == 'string' && +p == <any>p ?
			ctxs[<any>p]?.[key] ?? obj[p] : obj[p],
		set: (obj: any, p, val) => {
			if (p == 'length') {
				const n = obj.length = +val
				len = list.length
				if (!n || n > len)
					setCapacity(n)
				for (let d = len; d-- > n;)
					render(d)

				if (handle)
					cancelIdleCallback(handle)
				handle = requestIdleCallback(() => setCapacity(obj.length), { timeout: 500 })
			} else {
				obj[p] = val
				if (typeof p == 'string' && +p == <any>p)
					render(+p)
			}
			cydon.updateValue(value)
			return true
		}
	})
	Object.defineProperty(cydon, value, {
		get: () => items,
		set(v) {
			if (v != items) {
				items.length = v.length
				Object.assign(items, v)
			}
		}
	})
	if (newScope)
		cydon.onUpdate = (prop: string) => {
			if (deps.has(prop))
				for (const c of ctxs) {
					c.queue.add(prop)
					c.commit()
				}
		}

	setCapacity(arr.length)
	Object.assign(items, arr)
}

directives.push(({ name, value }): D => {
	if (name == 'c-if') {
		const func = getFunc('return ' + value)
		const data: Directive = {
			deps: new Set(),
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
		const isCheckbox = (<HTMLInputElement>el).type == 'checkbox'
		const isRadio = (<HTMLInputElement>el).type == 'radio'
		const isSelect = el.tagName == 'SELECT'
		const event = name != 'c-model' || isSelect || isCheckbox ? 'change' : 'input'
		const getter = getFunc('return ' + value)
		const setter = Function('$e', '$val', `with(this)${value}=$val`)
		return {
			deps: new Set(),
			func(el: Element & Data) {
				if (!el['$cydon_bind_' + event]) {
					el.addEventListener(event, () => {
						const newVal = isSelect && (<HTMLSelectElement>el).multiple ?
							[...(<HTMLSelectElement>el).selectedOptions].map(
								option => option.value || option.text) :
							isCheckbox ?
								(<HTMLInputElement>el).checked :
								(<HTMLInputElement>el).value
						setter.call(this, el, newVal)
					})
					el['$cydon_bind_' + event] = true
				}
				// Two-way binding
				const val = getter.call(this, el)
				if (isRadio)
					(<HTMLInputElement>el).checked = val == (<HTMLInputElement>el).value
				else if (isCheckbox)
					(<HTMLInputElement>el).checked = val
				else
					(<HTMLInputElement>el).value = val
			}
		}
	}
	// bind event
	if (name[0] == '@') {
		name = name.slice(1)
		// dynamic event name
		return {
			func(el) {
				el.addEventListener(name[0] == '$' ? this[name.slice(1)] : name,
					this[value].bind?.(this) ?? getFunc(value).bind(this, el))
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
				deps: new Set(),
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
			map.set(name, <Part>{ deps: new Set() })
		const attr = map.get(name)!
		attr.func = getFunc(code + `if($v!=$e.getAttribute('${name}'))$e.setAttribute('${name}',$v)`)
	}
}, ({ name, value }): D => {
	if (name[0] == '$') {
		name = name.slice(1)
		let attrName: string
		return {
			deps: new Set([name]),
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
			initial = (<HTMLElement>el).style.display
		return {
			deps: new Set(),
			func(el) {
				(<HTMLElement>el).style.display = func.call(this, el) ? initial : 'none'
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
})