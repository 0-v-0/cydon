import { Cydon, Data, Directive, directives, getFunc, Part, Results } from './core'
import { cloneNode } from './util'

interface ReactiveElement extends HTMLElement {
	cydon: Cydon
}

directives.push(function ({ name, value }): Directive | void {
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
})

export function for_(cydon: Cydon, el: Element, exp: string) {
	if (!exp)
		return

	const parent = el.parentElement!
	let [keys, value] = exp.split(';')
	if (import.meta.env.DEV && !value)
		console.warn('invalid v-for expression: ' + exp)

	let val = cydon.$data[value = value.trim()]
	if (!Array.isArray(val)) {
		import.meta.env.DEV && console.warn(`c-for: '${value}' is not an array`)
		return
	}
	el.remove()
	el.removeAttribute('c-for')
	const list = <HTMLCollectionOf<ReactiveElement>>parent.children
	const setCapacity = (n: number) => {
		let d = list.length

		for (; d < n; d++)
			render(d)
		for (; d-- > n;)
			list[d].remove()
	}

	const [key, index] = keys.split(/\s*,\s*/)
	const deps = new Set<string>()

	const onUpdate = (prop: string) => cydon.updateValue(prop)
	const c = new Cydon
	const results: Results = []
	c.compile(results, el)

	const render = (i: number) => {
		let target = list[i],
			item = val[i]
		if (!target) {
			target = <ReactiveElement>cloneNode(el)
			if (cydon != cydon.$data) {
				if (import.meta.env.DEV)
					console.warn('cydon: $data object must set to this')
				return
			}

			const c: Cydon & Data = Object.create(cydon)
			c.queue = new Set()
			c.targets = new Set()
			c.deps = deps
			c.onUpdate = onUpdate
			c.setData(c)
			if (index)
				c[index] = i
			c[key] = val[i] = new Proxy(item || {}, {
				set: (obj, p: string, val) => {
					obj[p] = val
					c.updateValue(key)
					c.updateValue(value)
					return true
				}
			})
			target.cydon = c
			c.bind(results, target)
			if (item)
				c.flush()
			parent.appendChild(target)
		}

		// if item is undefined, hide the element
		target.hidden = item == void 0

		// update data
		if (item)
			Object.assign(target.cydon.data[key], item)
	}

	//let handle = 0
	const items = new Proxy(val, {
		get: (obj: any, p) => typeof p == 'string' && isFinite(<any>p) ?
			list[<any>p]?.cydon.data[key] ?? obj[p] : obj[p],
		set: (obj: any, p, val) => {
			if (p == 'length') {
				const n = obj.length = +val
				if (n > list.length)
					setCapacity(n)
				for (let d = list.length; d-- > n;)
					render(d)

				//if (handle)
				//	cancelIdleCallback(handle)
				//handle = requestIdleCallback(() => setCapacity(obj.length), { timeout: 5000 })
			} else {
				obj[p] = val
				if (typeof p == 'string' && isFinite(<any>p))
					render(<any>p)
			}
			cydon.updateValue(value)
			return true
		}
	})
	Object.defineProperty(cydon.$data, value, {
		get: () => items,
		set(v) {
			if (v != items)
				Object.assign(items, v).length = v.length
		}
	})
	if (!cydon.onUpdate)
		cydon.onUpdate = (prop: string) => {
			if (deps.has(prop))
				for (const { cydon } of list) {
					cydon.onUpdate = void 0
					cydon.updateValue(prop)
					cydon.onUpdate = onUpdate
				}
		}

	Object.assign(items, val)
}

directives.push(function ({ name, value, ownerElement: el }): Directive | void {
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
})

directives.unshift(function ({ name, value }): Directive | void {
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
})

directives.push(function ({ name, value }): Directive | void {
	if (name == 'ref') {
		return {
			func(el) {
				if (import.meta.env.DEV && value in this.$data)
					console.warn(`The ref "${value}" has already defined on`, this.$data)
				this.$data[value] = el
			}
		}
	}
})

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
directives.push(function ({ name, value, ownerElement: el }, map): Directive | void {
	if (name[0] == ':') {
		name = name.substring(1)
		if (!name)
			return {
				deps: new Set(),
				func: getFunc(value)
			}

		if (!el.hasAttribute(name))
			el.setAttribute(name, '')
		const attrs = el.attributes
		const node = attrs[<any>name]
		if (!map.get(name))
			map.set(name, <Part>{ deps: new Set() })
		el.removeAttribute(':' + name)
		let attr = map.get(name)!
		let code = `let $v="${node.value}";`
		for (const cls of value.split(';')) {
			let key = cls,
				val = cls
			const p = cls.indexOf(':')
			if (~p) {
				key = cls.substring(0, p)
				val = cls.substring(p + 1)
			}
			code += `if(${val})$v+=" ${key.trim()}";`
		}
		attr.func = getFunc(code + `if($v!=$e.getAttribute('${name}'))$e.setAttribute('${name}',$v)`)
	}
})

directives.push(function ({ name, value }): Directive | void {
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
})

directives.push(function ({ name, value, ownerElement: el }): Directive | void {
	if (name == 'c-show') {
		const func = getFunc('return ' + value),
			initialValue = (<HTMLElement>el).style.display
		return {
			deps: new Set(),
			func(el) {
				(<HTMLElement>el).style.display = func.call(this, el) ? initialValue : 'none'
			}
		}
	}
})

directives.push(({ name }): Directive | void => {
	if (name == 'c-cloak')
		return {
			keep: true,
			func(el) {
				el.removeAttribute(name)
			}
		}
})