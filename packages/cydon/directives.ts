import { Cydon, Data, directives, Part } from './core'
import { cloneNode } from './util'

interface ReactiveElement extends HTMLElement {
	cydon: Cydon
}

export function _if(cydon: Cydon, el: Element, attr: Attr) {
	if (import.meta.env.DEV && !cydon.unbind)
		console.warn('unbind function is undefined')

	const parent = el.parentElement!
	const anchor = new Text()
	parent.insertBefore(anchor, el)
	const { value } = attr
	const deps = new Set<string>(),
		func = cydon.getFunc('return ' + value, el, deps)
	let lastValue = true
	const effect = () => {
		const val = func()
		if (val != lastValue) {
			lastValue = val
			if (val) {
				cydon.bind(el)
				if (!el.isConnected)
					parent.insertBefore(el, anchor)
			} else {
				cydon.unbind!(el)
				el.remove()
			}
		}
		return ''
	}
	cydon.add(attr, deps, [[effect]])
	effect()
}

export function _for(cydon: Cydon, el: Element, exp: string) {
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
			c.targets = new Map()
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
			c.bind(target)
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

	el.remove()
	el.removeAttribute('c-for')
	Object.assign(items, val)
}

directives.push(function (node): true | void {
	let { name, value, ownerElement: el } = node
	if (name == 'c-model' || name == 'c-model.lazy') {
		value = value.trim()
		const isCheckbox = (<HTMLInputElement>el).type == 'checkbox'
		const isRadio = (<HTMLInputElement>el).type == 'radio'
		const isSelect = el.tagName == 'SELECT'
		const event = name != 'c-model' || isSelect || isCheckbox ? 'change' : 'input'
		const setter = Function('$val', `with(this)${value}=$val`)
		el.addEventListener(event, () => {
			const newVal = isSelect && (<HTMLSelectElement>el).multiple ?
				[...(<HTMLSelectElement>el).selectedOptions].map(option => option.value || option.text) :
				isCheckbox ?
					(<HTMLInputElement>el).checked :
					(<HTMLInputElement>el).value
			setter.call(this.data, newVal)
		})
		// Two-way binding
		const deps = new Set<string>()
		const getter = this.getFunc('return ' + value, el, deps)
		const modify = () => {
			const val = getter()
			if (isRadio)
				(<HTMLInputElement>el).checked = val == (<HTMLInputElement>el).value
			else if (isCheckbox)
				(<HTMLInputElement>el).checked = val
			else
				(<HTMLInputElement>el).value = val
			return ''
		}
		modify()
		this.add(node, deps, [[modify]])
		return true
	}
	// bind event
	if (name[0] == '@') {
		name = name.slice(1)
		// dynamic event name
		el.addEventListener(name[0] == '$' ? this.data[name.slice(1)] : name,
			this.methods[value]?.bind(this.data) ?? this.getFunc(value, el))
		return true
	}
})

directives.unshift(function ({ name, value, ownerElement: el }): true | void {
	if (name == '@click.away') {
		const func = this.getFunc(value, el)
		el.addEventListener('click', e => {
			if (e.target != el && !el.contains(<Node>e.target))
				func(e)
		})
		return true
	}
})

directives.push(function ({ name, value, ownerElement: el }): true | void {
	if (name == 'ref') {
		if (import.meta.env.DEV && value in this.$data)
			console.warn(`The ref "${value}" has already defined on`, this.$data)
		this.$data[value] = el
		return true
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
directives.push(function (attr): true | void {
	let { name, value, ownerElement: el } = attr
	if (name[0] == ':') {
		name = name.substring(1)
		if (name) {
			if (!el.hasAttribute(name))
				el.setAttribute(name, '')
			const node = el.attributes[<any>name]
			let data = this.targets.get(node)
			if (!data) {
				this.add(node, new Set<string>(), [node.value])
				data = this.targets.get(node)!
			}
			for (const cls of value.split(';')) {
				let key = cls,
					val = cls
				const p = cls.indexOf(':')
				if (~p) {
					key = cls.substring(0, p)
					val = cls.substring(p + 1)
				}
				const part: Part = [, `${val}?'${(data.vals.length ? ' ' : '') + key.trim()}':''`]
				this.addPart(part, el, data.deps);
				(<Part[]>data.vals).push(part)
			}
		} else {
			const deps = new Set<string>()
			this.add(attr, deps, [[this.getFunc(value, el, deps)]])
		}
		return true
	}
})

directives.push(function (attr): true | void {
	let { name, value, ownerElement: el } = attr
	if (name[0] == '$') {
		name = name.slice(1)
		let attrName = this.data[name]
		el.setAttribute(attrName, value)
		this.add(attr, new Set([name]), [[() => {
			const newName = this.data[name]
			if (newName != attrName) {
				el.removeAttribute(attrName)
				if (newName)
					el.setAttribute(newName, value)
			}
			return ''
		}]])
		return true
	}
})

directives.push(function (attr): true | void {
	let { name, value, ownerElement: el } = attr
	if (name == 'c-show') {
		const deps = new Set<string>(),
			func = this.getFunc('return ' + value, el, deps),
			initialValue = (<HTMLElement>el).style.display
		this.add(attr, deps, [[() => {
			(<HTMLElement>el).style.display = func() ? initialValue : 'none'
			return ''
		}]])
		return true
	}
})

directives.push(attr => {
	if (attr.name == 'c-cloak')
		queueMicrotask(() => attr.ownerElement.removeAttribute(attr.name))
})