/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const RE = /\$(\{[\S\s]*?\})|\$([_a-zA-Z][_a-zA-Z0-9\.]*)(@[_a-zA-Z][_a-zA-Z0-9]*)?/,
	ToString = (value: string | Node | Function) => {
		if (typeof value == 'object')
			return value?.textContent || ''

		return typeof value == 'function' ? ToString(value()) : value
	}

function extractParts(s: string): (string | TargetValue)[] {
	const re = RegExp(RE, 'g'), parts: (string | TargetValue)[] = []
	let a: string[], lastIndex = 0
	for (; a = re.exec(s); lastIndex = re.lastIndex) {
		const [match, expr, prop, filter = ''] = a,
			start = re.lastIndex - match.length
		if (start)
			parts.push(s.substring(lastIndex, start))
		parts.push(expr ?
			[expr, Function('return ' + expr.slice(1, -1))] :
			[prop, filter])
	}
	if (lastIndex)
		parts.push(s.substring(lastIndex))
	return parts
}

export type Data = {
	[x: string]: any
}

export type Funcs = {
	[x: string]: (data?: any) => any
}

export type Methods = {
	[x: string]: (this: Data, e: Event) => any
}

export type TargetData = {
	node: Node
	deps: Set<string>
	vals: TargetValue | (string | TargetValue)[]
}

export type TargetValue = [string, (string | Function)?]

export class Cydon {
	private _filters: Funcs
	_data: Data
	data: Data
	queue = new Set<TargetData>()
	targets = new Map<Node, TargetData>()
	methods: Methods
	filters: Funcs

	constructor(data: Data = {}, methods: Methods = {}) {
		this.filters = new Proxy(this._filters = {}, {
			set: (obj, prop: string, handler: Function) => {
				obj[prop] = handler
				this.updateValue('@' + prop)
				return true
			}
		})
		this._data = data
		this.data = new Proxy(data, {
			get(obj, prop: string) {
				return prop in obj ? obj[prop] : '$' + prop
			},
			set: (obj, prop: string, value) => {
				obj[prop] = value
				this.updateValue(prop)
				return true
			}
		})
		this.methods = methods
	}
	// 绑定元素
	bind(element: Element | ShadowRoot) {
		const depsWalker = (node: Node) => new Proxy(this._data, {
			get: (obj, prop: string) => {
				this.targets.get(node)?.deps.add(prop)
				return prop in obj ? obj[prop] : '$' + prop
			}
		}), addPart = (part: TargetValue, deps: Set<string>, node: Node) => {
			const [key, val] = part
			if (typeof val == 'string') {
				deps.add(key)
				if (val)
					deps.add(val)
			} else
				part[1] = val.bind(depsWalker(node))
		}

		const walker = document.createTreeWalker(
			element,
			5 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT */)
		for (let n: Node = element; n; n = walker.nextNode()) {
			if (n.nodeType == 3) {
				let node: Text
				const parts = extractParts((n as Text).data)
				for (let i = 0; i < parts.length;) {
					const vals = parts[i++]
					if (typeof vals == 'string') {
						if (node) {
							node = node.splitText(0)
							node.data = vals
							if (i < parts.length) {
								node = node.splitText(vals.length)
								walker.nextNode()
							}
						}
						else
							node = (n as Text).splitText(vals.length)
						walker.nextNode()
					} else {
						const deps = new Set<string>(),
							data: TargetData = { node, deps, vals }
						addPart(vals, deps, node)
						this.add(data)
					}
				}
			} else {
				// Find pattern in attributes
				const attrs = (n as Element).attributes
				for (let i = 0; i < attrs?.length; ++i) {
					const { name, value } = attrs[i]
					if (name == 'c-model' || name == 'c-model.lazy')
						n.addEventListener(name == 'c-model' ? 'input' : 'change', e => {
							const newVal = (e.target as HTMLInputElement).value
							if (this.data[value] != newVal)
								this.data[value] = newVal
						})
					else if (name[0] == '@') {
						n.addEventListener(name.slice(1),
							(this.methods[value] || Function('e', value)).bind(this.data));
						(n as Element).removeAttribute(name)
						--i
					} else {
						const vals = extractParts(value)
						if (vals.length) {
							const deps = new Set<string>(),
								data: TargetData = { node: attrs[i], deps, vals }
							for (const p of vals) {
								if (typeof p == 'object')
									addPart(p, deps, attrs[i])
							}
							this.add(data)
						}
					}
				}
			}
		}
		this.updateQueued()
	}

	add(data: TargetData) {
		this.targets.set(data.node, data)
		this.queue.add(data)
	}

	// 解绑
	unbind(element: Element, searchChildren = true) {
		const targets = this.targets
		for (const [node] of targets) {
			if (node instanceof Attr) {
				if (node.ownerElement == element)
					targets.delete(node)
			} else
				if (searchChildren && element.contains(node))
					targets.delete(node)
		}
		for (const c of element.children)
			this.unbind(c, false)
	}

	update(data: TargetData) {
		const { node } = data
		if (node instanceof Attr) {
			let val = ''
			for (let p of data.vals)
				val += typeof p == 'object' ? ToString(this.getValue(p)) : p
			node.value = val
		} else {
			let newVal = this.getValue(data.vals as TargetValue)
			newVal = newVal.cloneNode?.(true) || new Text(ToString(newVal))
			this.targets.delete(node);
			(node as ChildNode).replaceWith(newVal)
			data.node = newVal
			this.targets.set(newVal, data)
		}
	}

	updateValue(prop: string) {
		if (this.queue.size == 0)
			requestAnimationFrame(() => this.updateQueued())
		for (const [, data] of this.targets)
			if (data.deps.has(prop))
				this.queue.add(data)
	}

	updateQueued() {
		for (const node of this.queue)
			this.update(node)
		this.queue.clear()
	}

	getValue([prop, filter]: TargetValue) {
		if (typeof filter != 'string')
			return filter
		const val = this.data[prop]
		filter = filter.substring(1)
		return filter in this._filters ? this._filters[filter](val) : val
	}
}
