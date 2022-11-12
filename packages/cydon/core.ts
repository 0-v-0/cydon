/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const ToString = (value: string | Node | Function): string =>
	typeof value == 'object' ? value?.textContent || '' :
		typeof value == 'function' ? ToString(value()) :
			value

function extractParts(s: string): (string | TargetValue)[] {
	const re = /\$\{([\S\s]+?)}|\$([_a-z]\w*)(?:@([_a-z]\w*))?/gi,
		parts: (string | TargetValue)[] = []
	let a: string[] | null, lastIndex!: number
	for (; a = re.exec(s); lastIndex = re.lastIndex) {
		const [match, expr, prop, filter = ''] = a,
			start = re.lastIndex - match.length
		if (start)
			parts.push(s.substring(lastIndex, start))
		parts.push(expr ?
			[expr, Function('$ctx', `with($ctx){return ${expr}}`)] :
			[prop, filter])
	}
	if (lastIndex < s.length)
		parts.push(s.substring(lastIndex))
	return parts
}

export type Data = Record<string, any>

export type Funcs = Record<string, (data?: any) => any>

export type Methods = Record<string, (this: Data, $evt: Event) => any>

export type CydonOption = {
	data?: Data
	methods?: Methods
	filters?: Funcs
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

export const directives: DirectiveHandler[] = []

export class Cydon {
	$data: Data
	data: Data
	queue = new Set<TargetData>()
	targets = new Map<Node, TargetData>()
	methods
	filters
	onUpdate?: (prop: string) => void

	constructor({
		data = {},
		methods = {},
		filters = {}
	}: CydonOption) {
		this.filters = new Proxy<Funcs>(filters, {
			set: (obj, prop: string, handler: (data?: any) => any) => {
				obj[prop] = handler
				this.updateValue('@' + prop)
				return true
			}
		})
		this.data = new Proxy(this.$data = data, {
			get: (obj, prop: string) =>
				prop in obj ? obj[prop] : '$' + prop,
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
	 * @param extract custom variable extraction function
	 */
	bind(element: Element | ShadowRoot, extract = extractParts) {
		const walker = document.createTreeWalker(
			element,
			5 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT */)
		for (let n: Node | null = element; n;) {
			// text node
			if (n.nodeType == 3) {
				let node = <Text>n
				const parts = extract(node.data)
				for (let i = 0; i < parts.length;) {
					const vals = parts[i++]
					let len
					if (typeof vals == 'string')
						len = vals.length
					else {
						len = vals[0].length + (typeof vals[1] == 'string' ? 1 : 3)
						const deps = new Set<string>()
						this.addPart(vals, deps, n.parentNode!)
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
							continue next
						}
					const vals = extract(node.value)
					if (vals.length) {
						const deps = new Set<string>()
						for (const p of vals) {
							if (typeof p == 'object')
								this.addPart(p, deps, n)
						}
						this.add({ node, deps, vals })
					}
					++i
				}
			}
			n = walker.nextNode()
		}
		this.updateQueued()
	}

	addPart(part: TargetValue, deps: Set<string>, node: Node) {
		const [key, val] = part
		if (typeof val == 'string') {
			deps.add(key)
			if (val)
				deps.add('@' + val)
		} else {
			const depsWalker = new Proxy(this.$data, {
				get: (obj, prop: string) => {
					deps.add(prop)
					return obj[prop] ?? '$' + prop.toString()
				}
			})
			part[1] = val!.bind(node, depsWalker)
		}
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
			for (const p of data.vals)
				val += typeof p == 'object' ? ToString(this.getValue(p)) : p
			node.value = val
		} else {
			let newVal = this.getValue(<TargetValue>data.vals)
			newVal = newVal?.cloneNode?.(true) || new Text(ToString(newVal))
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
		this.onUpdate?.(prop)
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
		return this.filters[filter] ? this.filters[filter](val) : val
	}

	getFunc(value: string, el?: Node) {
		return this.methods[value]?.bind(this.data) || Function('$ctx', '$evt', `with($ctx){${value}}`).bind(el, this.data)
	}
}

declare module globalThis {
	const CYDON_NO_UNBIND: boolean
}