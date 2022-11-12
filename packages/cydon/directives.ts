import { directives, TargetValue } from './core'

directives.push(function (node): true | void {
	let { name, value, ownerElement: el } = node
	if (name == 'c-model' || name == 'c-model.lazy') {
		const isCheckbox = (<HTMLInputElement>el).type == 'checkbox'
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
		this.add(({
			node, deps: new Set([value]), vals: [['', () => {
				if (isCheckbox)
					(<HTMLInputElement>el).checked = this.data[value]
				else
					(<HTMLInputElement>el).value = this.data[value]
				return ''
			}]]
		}))
		if (isCheckbox)
			(<HTMLInputElement>el).checked = this.data[value]
		return true
	}
	// bind event
	if (name[0] == '@') {
		name = name.slice(1)
		// dynamic event name
		el.addEventListener(name[0] == '$' ? this.data[name.slice(1)] : name, this.getFunc(value))
		return true
	}
})

directives.unshift(function ({ name, value, ownerElement: el }) {
	if (name == '@click.away') {
		const func = this.getFunc(value, el)
		el.addEventListener('click', e => {
			if (e.target != el && !el.contains(<Node>e.target))
				func(e)
		})
		return true
	}
	return
})

directives.push(function ({ name, value, ownerElement: el }) {
	if (name == 'ref') {
		if (import.meta.env.DEV && value in this.$data)
			console.warn(`The ref "${value}" has already defined on`, this.$data)
		this.$data[value] = el
		return true
	}
	return
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
directives.push(function ({ name, value, ownerElement: el }): true | void {
	if (name[0] == ':') {
		name = name.substring(1)
		if (!el.hasAttribute(name))
			el.setAttribute(name, '')
		const node = el.attributes[<any>name]
		let data = this.targets.get(node)
		if (!data)
			this.add(data = { node, deps: new Set(), vals: [node.value] })
		for (const cls of value.split(';')) {
			const p = cls.indexOf(':')
			if (~p) {
				const part = <TargetValue>['',
					Function('$ctx', `with($ctx){return ${cls.substring(p + 1)}?'${(data.vals.length ? ' ' : '') +
						cls.substring(0, p)}':''}`)]
				this.addPart(part, data.deps, el);
				(<TargetValue[]>data.vals).push(part)
			}
		}
		return true
	}
})

directives.push(function ({ name, value, ownerElement: el }): true | void {
	if (name[0] == '$') {
		name = name.slice(1)
		let attrName = this.data[name]
		el.setAttribute(attrName, value)
		const node = el.attributes[<any>name]
		this.add(({
			node, deps: new Set([name]), vals: [['', () => {
				const newName = this.data[name]
				if (newName != attrName) {
					el.removeAttribute(attrName)
					if (newName)
						el.setAttribute(newName, value)
				}
				return ''
			}
			]]
		}))
		return true
	}
})

directives.push(attr => {
	if (attr.name == 'c-cloak')
		queueMicrotask(() => attr.ownerElement.removeAttribute(attr.name))
})