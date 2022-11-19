/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { cloneWithShadowRoots, Constructor, ReactiveElement } from './util'

type Value = string | Function

type AttrValue = string | [Value]

const ToString = (value: Value): string =>
	typeof value == 'function' ? ToString(value()) :
		value

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

export type Methods = Record<string, (this: Data, $evt: Event) => any>

export type Target = {
	node: { nodeValue: string | null }
	deps: Set<string>
	vals: Value | AttrValue[]
}

export type Part = [string] | [Function | undefined, string]

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
		queue = new Set<Target>()

		/**
		 * bound nodes
		 */
		targets = new Map<Node, Target>()


		methods: Methods

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: ConstructorParameters<Constructor<T>>) {
			super(...args)
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
			// Find pattern in attributes
			const attrs = (<Element>el).attributes
			if (attrs) {
				if (attrs[<any>'c-pre'])
					return
				const exp = attrs[<any>'c-for']
				if (exp)
					return this._for(<Element>el, exp)
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
						if (typeof vals != 'string') {
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
				requestAnimationFrame(() => this.flush())
			for (const [, data] of this.targets)
				if (data.deps.has(prop))
					this.queue.add(data)
			this.onUpdate?.(prop)
		}

		/**
		 * update queued nodes immediately and clear queue
		 */
		flush() {
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
					if (typeof prop == 'string')
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
				this.flush()
			}
		}

		/**
		 * render target element with the item
		 *
		 * @param el target element, return a new element if it is undefined
		 * @param item item to render
		 * @param keys keys of a item
		 * @returns element
		 */
		render(el: ReactiveElement, item?: {}, keys: string[] = []) {
			// if item is undefined, hide the element
			el.data.hidden = item == void 0

			// update data
			if (item) {
				for (const key of keys)
					el.data[key] = (<Data>item)[key]
			}
			let exp = el.getAttribute('c-pass')
			if (exp) {
				for (const s of exp.split(',')) {
					let p = s.indexOf(':'),
						key = s,
						val = s
					if (~p) {
						key = s.substring(0, p)
						val = s.substring(p + 1)
					}
					(<Data>el)[val.trim()] = this.$data[key.trim()]
				}
				el.removeAttribute('c-pass')
			}
			return el
		}

		_for(el: Element, attr: Attr) {
			const exp = attr.value,
				parent = el.parentElement!
			let [keyexpr, value] = exp.split(';'),
				val = this.$data[value = value.trim()]
			if (!Array.isArray(val)) {
				import.meta.env.DEV && console.warn(`c-for: '${value}' is not an array`)
				return
			}
			const keys = keyexpr.split(/\s*,\s*/),
				list = parent.children
			const proxy = new Proxy(val, {
				get: (obj, prop: any) => {
					const val = obj[prop]
					return (val && (<ReactiveElement>list[prop])?.data) ?? val
				},
				set: (obj: any, prop, val) => {
					if (prop == 'length') {
						const n = obj.length = +val
						if (n > list.length) {
							let d = list.length
							for (; d < n; d++)
								parent.append(this.render(<ReactiveElement>cloneWithShadowRoots(el)))
							for (; d-- > n;)
								list[d].remove()
						}
						for (let d = list.length; d-- > n;)
							this.render(<ReactiveElement>list[d], void 0, keys)
					} else {
						if (typeof prop == 'string' && <any>prop == parseInt(prop)) {
							const old = list[<any>prop],
								node = this.render(<ReactiveElement>old || cloneWithShadowRoots(el), val, keys)
							if (old) {
								if (old != node)
									old.replaceWith(node)
							} else
								parent.append(node)
							obj[prop] = node
						} else
							obj[prop] = val
					}
					this.updateValue(value)
					return true
				}
			})
			Object.defineProperty(this.$data, value, {
				get: () => proxy,
				set(items) {
					if (items != proxy)
						Object.assign(proxy, items).length = items.length
				}
			})
			el.remove()
			el.removeAttribute('c-for')
			Object.assign(proxy, val)
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