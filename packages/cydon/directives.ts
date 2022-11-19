import { directives, Part } from './core'

directives.push(function (node): true | void {
	let { name, value, ownerElement: el } = node
	if (name == 'c-model' || name == 'c-model.lazy') {
		const isCheckbox = (<HTMLInputElement>el).type == 'checkbox'
		const isRadio = (<HTMLInputElement>el).type == 'radio'
		const isSelect = el.tagName == 'SELECT'
		const event = name != 'c-model' || isSelect || isCheckbox ? 'change' : 'input'
		el.addEventListener(event, () => {
			const newVal = isSelect && (<HTMLSelectElement>el).multiple ?
				[...(<HTMLSelectElement>el).selectedOptions].map(option => option.value || option.text) :
				isCheckbox ?
					(<HTMLInputElement>el).checked :
					(<HTMLInputElement>el).value
			this.data[value] = newVal
		})
		// Two-way binding
		const deps = new Set([value])
		this.add(node, deps, [[() => {
			const val = this.getDeps(value, deps)
			if (isRadio)
				(<HTMLInputElement>el).checked = val == (<HTMLInputElement>el).value
			else if (isCheckbox)
				(<HTMLInputElement>el).checked = val
			else
				(<HTMLInputElement>el).value = val
			return ''
		}]])
		if (isCheckbox)
			(<HTMLInputElement>el).checked = this.getDeps(value, deps)
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