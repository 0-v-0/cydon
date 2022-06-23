/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const RE = /\$\{([\S\s]+?)\}|\$([_a-zA-Z][_a-zA-Z0-9]*)(?:@([_a-zA-Z][_a-zA-Z0-9]*))?/,
	ToString = (value: string | Node | Function): string => {
		if (typeof value == 'object')
			return value?.textContent || ''

		return typeof value == 'function' ? ToString(value()) : value
	}

function extractParts(s: string): (string | TargetValue)[] {
	const re = RegExp(RE, 'g'), parts: (string | TargetValue)[] = []
	let a: string[] | null, lastIndex!: number
	for (; a = re.exec(s); lastIndex = re.lastIndex) {
		const [match, expr, prop, filter = ''] = a,
			start = re.lastIndex - match.length
		if (start)
			parts.push(s.substring(lastIndex, start))
		parts.push(expr ?
			[expr, Function(`with(this){return ${expr}}`)] :
			[prop, filter])
	}
	if (lastIndex < s.length)
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

export type TargetValue = [string, string | Function]

type DOMAttr = Attr & {
	ownerElement: Element
}

export type DirectiveHandler = (this: Cydon, attr: DOMAttr) => boolean | void

export const directives: DirectiveHandler[] = [function ({ name, value, ownerElement: n }) {
	if (name == 'c-model' || name == 'c-model.lazy') {
		n.addEventListener(name == 'c-model' ? 'input' : 'change', e => {
			const newVal = (<HTMLInputElement>e.target).value
			if (this.data[value] != newVal)
				this.data[value] = newVal
		})
		return true
	}
	if (name[0] == '@') {
		n.addEventListener(name.slice(1), this.getFunc(value))
		return true
	}
	return
}]

export class Cydon {
	private _filters: Funcs
	$data: Data
	data: Data
	queue = new Set<TargetData>()
	targets = new Map<Node, TargetData>()
	methods
	filters

	constructor({
		data = <Data>{},
		methods = <Methods>{},
		filters = <Funcs>{}
	}) {
		this.filters = new Proxy<Funcs>(this._filters = filters, {
			set: (obj, prop: string, handler: (data?: any) => any) => {
				obj[prop] = handler
				this.updateValue('@' + prop)
				return true
			}
		})
		this.data = new Proxy(this.$data = data, {
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
		if (!globalThis.CYDON_NO_UNBIND)
			this.unbind = (element: Element, searchChildren = true) => {
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
					this.unbind!(c, false)
			}
	}

	/**
	 * bind an element and update it immediately
	 * @param element target element
	 */
	bind(element: Element | ShadowRoot) {
		const depsWalker = (node: Node) => new Proxy(this.$data, {
			get: (obj, prop: string) => {
				this.targets.get(node)?.deps.add(prop)
				return obj[prop] ?? '$' + prop.toString()
			}
		}), addPart = (part: TargetValue, deps: Set<string>, node: Node) => {
			const [key, val] = part
			if (typeof val == 'string') {
				deps.add(key)
				if (val)
					deps.add('@' + val)
			} else
				part[1] = val!.bind(depsWalker(node))
		}

		const walker = document.createTreeWalker(
			element,
			5 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT */)
		for (let n: Node | null = element; n;) {
			if (n.nodeType == 3) {
				let node = <Text>n
				const parts = extractParts(node.data)
				for (let i = 0; i < parts.length;) {
					const vals = parts[i++]
					let len;
					if (typeof vals == 'string')
						len = vals.length
					else {
						len = vals[0].length + (typeof vals[1] == 'string' ? 1 : 3)
						const deps = new Set<string>()
						addPart(vals, deps, node)
						this.add({ node, deps, vals })
					}
					if (parts[i]) {
						node = node.splitText(len)
						walker.nextNode()
					}
				}
			} else {
				// Find pattern in attributes
				const attrs = (<Element>n).attributes
				next: for (let i = 0; i < attrs?.length;) {
					const node = <DOMAttr>attrs[i]
					for (const handler of directives)
						if (handler.call(this, node)) {
							(<Element>n).removeAttribute(node.name)
							continue next;
						}
					const vals = extractParts(node.value)
					if (vals.length) {
						const deps = new Set<string>()
						for (const p of vals) {
							if (typeof p == 'object')
								addPart(p, deps, node)
						}
						this.add({ node, deps, vals })
					}
					++i;
				}
			}
			n = walker.nextNode()
		}
		this.updateQueued()
	}

	/**
	 * add a node
	 * @param data target
	 */
	add(data: TargetData) {
		this.targets.set(data.node, data)
		this.queue.add(data)
	}

	/**
	 * unbind an element
	 * @param element target element
	 */
	unbind

	/**
	 * update a node
	 * @param data target
	 */
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

	/**
	 * update all nodes with specific variable
	 * @param prop variable
	 */
	updateValue(prop: string) {
		if (this.queue.size == 0)
			requestAnimationFrame(() => this.updateQueued())
		for (const [, data] of this.targets)
			if (data.deps.has(prop))
				this.queue.add(data)
	}

	/**
	 * update queued nodes immediately and clear queue
	 */
	updateQueued() {
		for (const node of this.queue)
			this.update(node)
		this.queue.clear()
	}

	getValue([prop, filter]: TargetValue) {
		if (typeof filter != 'string')
			return filter
		const val = this.data[prop]
		return this._filters[filter] ? this._filters[filter](val) : val
	}

	getFunc(value: string) {
		return (this.methods[value] || Function('e', `with(this){${value}}`)).bind(this.data)
	}
}

declare module globalThis {
	const CYDON_NO_UNBIND: boolean
}