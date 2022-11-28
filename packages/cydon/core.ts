/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { _for, _if } from './directives'
import { Constructor as Ctor } from './util'

type Value = string | Function

type AttrValue = string | [Value]

const ToString = (value: Value): string =>
	typeof value == 'function' ? ToString(value()) : value

function extractParts(s: string): (string | Part)[] {
	const re = /\$\{([\S\s]+?)}|\$([_a-z]\w*)/gi,
		parts: (string | Part)[] = []
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

export type Methods = Record<string, (this: Data, $e: Event) => any>

export type Part = [string] | [Function | undefined, string]

export type Target = {
	node: { nodeValue: string | null }
	deps: Set<string>
	vals: Value | AttrValue[]
}

type DOMAttr = Attr & {
	ownerElement: Element
}

export type DirectiveHandler = (this: Cydon, attr: DOMAttr) => boolean | void

export const directives: DirectiveHandler[] = []

export const CydonOf = <T extends {}>(base: Ctor<T> = <any>Object) => {
	class Mixin extends (<Ctor<Object>>base) {
		/**
		 * raw data object
		 */
		$data!: Data

		/**
		 * reactive data object
		 */
		data!: Data

		/**
		 * render queue
		 */
		queue = new Set<Target | string>()

		/**
		 * bound nodes
		 */
		targets = new Map<Node, Target>()


		methods: Methods = <any>this

		deps?: Set<string>

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			this.setData(data || this)
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

		setData(data: Data) {
			this.data = new Proxy(this.$data = data, {
				get: (obj, p: string) =>
					p in obj ? obj[p] : '$' + p.toString(),
				set: (obj, p: string, value) => {
					obj[p] = value
					this.updateValue(p)
					return true
				}
			})
		}

		bind(el: Element | ShadowRoot = <any>this, extract = extractParts): void {
			// Find pattern in attributes
			const attrs = (<Element>el).attributes
			if (attrs) {
				let exp = attrs[<any>'c-if']
				if (exp)
					return _if(this, <Element>el, exp)
				exp = attrs[<any>'c-for']
				if (exp)
					return _for(this, <Element>el, exp.value)
				next: for (let i = 0; i < attrs.length;) {
					const node = <DOMAttr>attrs[i]
					for (const handler of directives)
						if (handler.call(this, node)) {
							(<Element>el).removeAttribute(node.name)
							continue next
						}
					const vals = extract(node.value)
					if (vals.length) {
						const deps = new Set<string>()
						for (const p of vals) {
							if (typeof p == 'object')
								this.addPart(p, el, deps)
						}
						this.add(node, deps, <AttrValue[]>vals)
					}
					++i
				}
			}
			for (const n of el.childNodes) {
				if (n.nodeType == 1)
					this.bind(<Element>n, extract)
				if (n.nodeType == 3) { // text node
					let node = <Text>n
					const parts = extract(node.data)
					for (let i = 0; i < parts.length;) {
						const vals = parts[i++]
						let len = vals.length
						if (typeof vals == 'object') {
							len = vals[len - 1]!.length + (vals[1] ? 3 : 1)
							const deps = new Set<string>()
							this.addPart(vals, n.parentNode!, deps)
							this.add(node, deps, vals[0]!)
						}
						if (parts[i])
							node = node.splitText(len)
					}
				}
			}
		}

		addPart(part: Part, node: Node, deps: Set<string>) {
			if (part[1]) {
				part[0] = this.getFunc('return ' + part[1], node, deps)
				part.length = 1
			} else
				deps.add(<string>part[0])
		}

		add(node: Node, deps: Set<string>, vals: Value | AttrValue[]) {
			const data = { node, deps, vals }

			this.targets.set(node, data)
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
		update({ node, vals }: Target) {
			const getValue = (prop: Value) =>
				ToString(typeof prop == 'string' ? this.data[prop] : prop)

			let val = ''
			if (typeof vals == 'object')
				for (const p of vals)
					val += typeof p == 'object' ? getValue(p[0]) : p
			else
				val = getValue(vals)
			node.nodeValue = val
		}

		/**
		 * update all nodes with specific variable
		 * @param prop variable
		 */
		updateValue(prop: string) {
			if (this.queue.size == 0)
				queueMicrotask(() => this.flush())
			this.queue.add(prop)
			this.onUpdate?.(prop)
		}

		/**
		 * update queued nodes immediately and clear queue
		 */
		flush() {
			for (const [, data] of this.targets) {
				if (this.queue.has(data))
					this.update(data)
				else
					for (const node of this.queue) {
						if (typeof node == 'string' && data.deps.has(node)) {
							this.update(data)
							break
						}
					}
			}
			this.queue.clear()
		}

		getFunc(value: string, el?: Node, deps?: Set<string>): Function {
			const depsWalker = (obj: Data & Object) => {
				const proto = Object.getPrototypeOf(obj)
				return new Proxy(obj, {
					get: (obj, p: string) => {
						if (typeof p == 'string') {
							if (this.deps && p in proto)
								this.deps.add(p)
							deps!.add(p)
						}
						return p in obj ? obj[p] : '$' + p.toString()
					}
				})
			}
			return Function('$ctx', '$e', `with($ctx){${value}}`).bind(el,
				deps ? depsWalker(this.$data) : this.data)
		}

		connectedCallback() {
			if (this instanceof Element && !this.hasAttribute('c-for')) {
				if (this.shadowRoot)
					this.bind(this.shadowRoot)
				this.bind()
				this.flush()
			}
		}
	}
	return <Ctor<T & Mixin>>Mixin
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