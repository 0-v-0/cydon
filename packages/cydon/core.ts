/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { Constructor } from './util'

const ToString = (value: string | Node | Function): string =>
	typeof value == 'object' ? value?.textContent || '' :
		typeof value == 'function' ? ToString(value()) :
			value

function extractParts(s: string): (string | TargetValue)[] {
	const re = /\$\{([\S\s]+?)}|\$([_a-z]\w*)/gi,
		parts: (string | TargetValue)[] = []
	let a: string[] | null, lastIndex!: number
	for (; a = re.exec(s); lastIndex = re.lastIndex) {
		const [match, expr, prop] = a,
			start = re.lastIndex - match.length
		if (start)
			parts.push(s.substring(lastIndex, start))
		parts.push(expr ? [, expr] : [prop])
	}
	if (lastIndex < s.length)
		parts.push(s.substring(lastIndex))
	return parts
}

export type Data = Record<string, any>

export type Methods = Record<string, (this: Data, $evt: Event) => any>

type Value = string | Function

type AttrValue = string | [Value]

export type TargetData = {
	node: Node
	deps: Set<string>
	vals: Value | AttrValue[]
}

export type TargetValue = [string] | [Function | undefined, string]

type DOMAttr = Attr & {
	ownerElement: Element
}

export type DirectiveHandler = (this: Cydon, attr: DOMAttr) => boolean | void

export const directives: DirectiveHandler[] = []

export const CydonOf = <T extends {}>(base: Constructor<T> = <any>Object) => {
	class Mixin extends (<Constructor<Object>>base) {
		/**
		 * raw data object
		 */
		$data: Data

		/**
		 * reactive data object
		 */
		data: Data

		/**
		 * render queue
		 */
		queue = new Set<TargetData>()

		/**
		 * bound nodes
		 */
		targets = new Map<Node, TargetData>()


		methods: Methods

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: any[]) {
			super(...args)
			//this.cydon = new Cydon({ data: data || this, methods: <any>this })
			this.data = new Proxy(this.$data = data || this, {
				get: (obj, prop: string) =>
					prop in obj ? obj[prop] : '$' + prop,
				set: (obj, prop: string, value) => {
					obj[prop] = value
					this.updateValue(prop)
					return true
				}
			})
			this.methods = <any>this
			if (!globalThis.CYDON_NO_UNBIND)
				this.unbind = (el: Element, searchChildren = true) => {
					for (const [node] of this.targets) {
						if (node instanceof Attr) {
							if (node.ownerElement == el)
								this.targets.delete(node)
						} else
							if (searchChildren && el.contains(node))
								this.targets.delete(node)
					}
					for (const c of el.children)
						this.unbind!(c, false)
				}
		}

		bind(el: Element | ShadowRoot = <any>this, extract = extractParts) {
			const walker = document.createTreeWalker(
				el,
				5 /* NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT */)
			for (let n: Node | null = el; n;) {
				// text node
				if (n.nodeType == 3) {
					let node = <Text>n
					const parts = extract(node.data)
					for (let i = 0; i < parts.length;) {
						const vals = parts[i++]
						let len = vals.length
						if (typeof vals != 'string') {
							len = vals[len - 1]!.length + (vals[1] ? 3 : 1)
							const deps = new Set<string>()
							this.addPart(vals, n.parentNode!, deps)
							this.add({ node, deps, vals: vals[0]! })
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
									this.addPart(p, n, deps)
							}
							this.add({ node, deps, vals: <AttrValue[]>vals })
						}
						++i
					}
				}
				n = walker.nextNode()
			}
			this.nextTick()
		}

		addPart(part: TargetValue, node: Node, deps: Set<string>) {
			if (part[1]) {
				part[0] = this.getFunc('return ' + part[1], node, deps)
				part.length = 1
			} else
				deps.add(<string>part[0])
		}

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
			const getValue = (prop: Value) => typeof prop != 'string' ? prop : this.data[prop]

			const { node } = data
			if (node instanceof Attr) {
				let val = ''
				for (const p of <AttrValue[]>data.vals)
					val += typeof p == 'object' ? ToString(getValue(p[0])) : p
				node.value = val
			} else {
				let newVal = getValue(<Value>data.vals)
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
				requestAnimationFrame(() => this.nextTick())
			for (const [, data] of this.targets)
				if (data.deps.has(prop))
					this.queue.add(data)
			this.onUpdate?.(prop)
		}

		/**
		 * update queued nodes immediately and clear queue
		 */
		nextTick() {
			for (const node of this.queue)
				this.update(node)
			this.queue.clear()
		}

		getDeps(prop: string, deps: Set<string>) {
			const val = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this.$data), prop)?.get
			return val ? val.call(this.depsWalker(deps)) : this.$data[prop]
		}

		getFunc(value: string, el?: Node, deps?: Set<string>): Function {
			return Function('$ctx', '$evt', `with($ctx){${value}}`).bind(el,
				deps ? this.depsWalker(deps) : this.data)
		}

		depsWalker(deps: Set<string>) {
			return new Proxy(this.$data, {
				get: (obj, prop: string) => {
					deps.add(prop)
					return obj[prop] ?? '$' + prop.toString()
				}
			})
		}

		connectedCallback() {
			if (this instanceof Element) {
				if (this.shadowRoot)
					this.bind(this.shadowRoot)
				this.bind()
			}
		}
	}
	return <Constructor<T & Mixin>>Mixin
}

/**
 * Base element class that manages element properties and attributes.
 */
export const CydonElement = CydonOf(HTMLElement)

export type CydonElement = InstanceType<typeof CydonElement>

export const Cydon = CydonOf()

export type Cydon = InstanceType<typeof Cydon>

declare module globalThis {
	const CYDON_NO_UNBIND: boolean
}