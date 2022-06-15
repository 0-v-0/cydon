/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const RE = /\$\{([\S\s]+?)\}|\$([_a-zA-Z][_a-zA-Z0-9\.]*)(@[_a-zA-Z][_a-zA-Z0-9]*)?/,
	ToString = (value: string | Node | Function): string => {
		if (typeof value == 'object')
			return value?.textContent || ''

		return typeof value == 'function' ? ToString(value()) : value
	}

function extractParts(s: string): (string | TargetValue)[] {
	const re = RegExp(RE, 'g'), parts: (string | TargetValue)[] = []
	let a: string[] | null, lastIndex = 0
	for (; a = re.exec(s); lastIndex = re.lastIndex) {
		const [match, expr, prop, filter = ''] = a,
			start = re.lastIndex - match.length
		if (start)
			parts.push(s.substring(lastIndex, start))
		parts.push(expr ?
			[expr, Function(`with(this){return ${expr}}`)] :
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

export type DirectiveHandler = (this: Cydon, attr: Attr) => boolean | void

export const directives: DirectiveHandler[] = []

export class Cydon {
	private _filters: Funcs
	_data: Data
	data: Data
	queue = new Set<TargetData>()
	targets = new Map<Node, TargetData>()
	methods
	filters
	directives

	constructor({
		data = <Data>{},
		methods = <Methods>{},
		filters = <Funcs>{},
		directives: d = <Iterable<DirectiveHandler>>[...directives]
	}) {
		this.filters = new Proxy<Funcs>(this._filters = filters, {
			set: (obj, prop: string, handler: (data?: any) => any) => {
				obj[prop] = handler
				this.updateValue('@' + prop)
				return true
			}
		})
		this.data = new Proxy(this._data = data, {
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
		this.directives = d
	}

	// 绑定元素
	bind(element: Element | ShadowRoot) {
		const depsWalker = (node: Node) => new Proxy(this._data, {
			get: (obj, prop: string) => {
				this.targets.get(node)?.deps.add(prop)
				return obj[prop] ?? '$' + prop.toString()
			}
		}), addPart = (part: TargetValue, deps: Set<string>, node: Node) => {
			const [key, val] = part
			if (typeof val == 'string') {
				deps.add(key)
				if (val)
					deps.add(val)
			} else
				part[1] = val!.bind(depsWalker(node))
		}

		const walker = document.createTreeWalker(
			element,
			5 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT */)
		for (let n: Node | null = element; n; n = walker.nextNode()) {
			if (n.nodeType == 3) {
				let node: Text
				const parts = extractParts((<Text>n).data)
				for (let i = 0; i < parts.length;) {
					const vals = parts[i++]
					if (typeof vals == 'string') {
						if (node!) {
							node = node.splitText(0)
							node.data = vals
							if (i < parts.length) {
								node = node.splitText(vals.length)
								walker.nextNode()
							}
						}
						else
							node = (<Text>n).splitText(vals.length)
						walker.nextNode()
					} else {
						const deps = new Set<string>(),
							data: TargetData = { node: node!, deps, vals }
						addPart(vals, deps, node!)
						this.add(data)
					}
				}
			} else {
				// Find pattern in attributes
				const attrs = (<Element>n).attributes
				next: for (let i = 0; i < attrs?.length;) {
					const node = attrs[i]
					for (const handler of this.directives)
						if (handler.call(this, node)) {
							(<Element>n).removeAttribute(node.name)
							continue next;
						}
					const vals = extractParts(node.value)
					if (vals.length) {
						const deps = new Set<string>(),
							data: TargetData = { node, deps, vals }
						for (const p of vals) {
							if (typeof p == 'object')
								addPart(p, deps, node)
						}
						this.add(data)
					}
					++i;
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
			let newVal = this.getValue(<TargetValue>data.vals)
			newVal = newVal.cloneNode?.(true) || new Text(ToString(newVal))
			this.targets.delete(node);
			(<ChildNode>node).replaceWith(newVal)
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

	getFunc(value: string) {
		return (this.methods[value] || Function('e', `with(this){${value}}`)).bind(this.data)
	}
}
