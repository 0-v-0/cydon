/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { for_ } from './directives'
import { Constructor as Ctor } from './util'

export const getFunc = (code: string) => <(this: Data, el: Element) => any>
	Function('$e', `with(this){${code}}`)

function parse(s: string) {
	const re = /(\$\{[\S\s]+?})|\$([_a-z]\w*)/gi
	let a = re.exec(s), lastIndex!: number
	if (!a)
		return null

	const deps = new Set<string>()
	let vals = ''
	for (; a; a = re.exec(s)) {
		const [match, expr, prop] = a,
			start = re.lastIndex - match.length
		if (start)
			vals += s.substring(lastIndex, start).replace(/`/g, '\\`')
		vals += expr || (deps.add(prop), '${' + prop + '}')
		lastIndex = re.lastIndex
	}
	if (lastIndex < s.length)
		vals += s.substring(lastIndex).replace(/`/g, '\\`')
	return {
		deps, func: getFunc('return `' + vals + '`')
	}
}

export type Data = Record<string, any>

export type Part = {
	deps?: Set<string>
	func: Target['func']
}

export type AttrPart = Part & { keep?: boolean }

export type Func = (this: Data, el: Element) => string

export type Target = {
	node: Text | Element
	deps?: Set<string>
	data?: Data
	func: Func | ((this: Data, el: Element) => void)
}

// template result
export type Results = Map<number, Results | Part> & {
	attrs?: Map<string, AttrPart>
}

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Directive = {
	deps?: Set<string>
	func?: Target['func']
	keep?: boolean
}

export type DirectiveHandler =
	(this: Cydon, attr: DOMAttr, attrs: Map<string, AttrPart>) => Directive | void

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
		targets = new Set<Target>()

		deps?: Set<string>

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			this.setData(data || this)
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

		compile(results: Results, el: Element | ShadowRoot): void {
			// Find pattern in attributes
			const attrs = (<Element>el).attributes
			if (attrs) {
				const map = new Map<string, AttrPart>()
				const exp = attrs[<any>'c-for']
				if (exp)
					return for_(this, <Element>el, exp.value)
				next: for (let i = 0; i < attrs.length;) {
					const node = <DOMAttr>attrs[i]
					for (const handler of directives) {
						const data = handler.call(this, node, map)
						if (data) {
							map.set(node.name, <AttrPart>data)
							if (data.keep)
								++i
							else
								(<Element>el).removeAttribute(node.name)
							continue next
						}
					}
					const parts = parse(node.value)
					if (parts) {
						const name = node.name
						const func = parts.func
							; (<AttrPart>parts).func = function (this: Data, el: Element) {
								el.setAttribute(name, func.call(this, el))
							}
						map.set(node.name, parts)
					}
					++i
				}
				if (map.size)
					results.attrs = map
			}
			let node = el.firstChild!
			let r: Results = new Map
			for (let i = 0; node; ++i) {
				if (node.nodeType == 1) {
					this.compile(r, <Element>node)
					if (r.size || r.attrs) {
						results.set(i, r)
						r = new Map
					}
				}
				if (node.nodeType == 3) { // text node
					const parts = parse((<Text>node).data)
					if (parts)
						results.set(i, parts)
				}
				node = node.nextSibling!
			}
		}

		bind(results: Results, node: Element | ShadowRoot = <any>this): void {
			const { attrs } = results
			if (attrs) {
				for (const [, part] of attrs)
					this.add(<Element>node, part)
			}
			let child = node.firstChild!
			let i = 0
			for (const [n, children] of results) {
				for (; i < n; ++i) child = child.nextSibling!
				if ((<Part>children).func)
					this.add(<Text>child, <Part>children)
				else
					this.bind(<Results>children, <Element>child)
			}
		}

		mount(el: Element | ShadowRoot = <any>this) {
			const results = new Map
			this.compile(results, el)
			this.bind(results, el)
		}

		add(node: Target['node'], part: Part) {
			const target: Target = Object.create(part),
				deps = part.deps
			target.node = node
			if (deps) {
				const proto = Object.getPrototypeOf(this.$data)
				const data: Data = target.data = new Proxy(this.$data, {
					get: (obj, p) => {
						if (typeof p == 'string') {
							if (this.deps && p in proto)
								this.deps.add(p)
							deps.add(p)
						}
						return p in obj ? Reflect.get(obj, p, data) : '$' + p.toString()
					}
				})
			}

			this.targets.add(target)
			this.queue.add(target)
		}

		/**
		 * unmount an element
		 * @param el target element
		 */
		unmount(el: Element | ShadowRoot = <any>this) {
			for (const target of this.targets) {
				const node = target.node
				if (el.contains(node))
					this.targets.delete(target)
			}
		}

		/**
		 * update a node
		 * @param target
		 */
		update(target: Target) {
			const { node, data = this.data, func: vals } = target

			if (node.nodeType == 3)
				(<Text>node).data = (<Func>vals).call(data, <Element>node.parentNode)
			else
				(<Func>vals).call(data, <Element>(node.nodeType == 1 ? node : node.parentNode))
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
			for (const target of this.targets) {
				if (this.queue.has(target)) {
					this.update(target)
					if (!target.deps)
						this.targets.delete(target)
				} else
					for (const node of this.queue) {
						if (typeof node == 'string' && target.deps?.has(node)) {
							this.update(target)
							break
						}
					}
			}
			this.queue.clear()
		}

		connectedCallback() {
			if (this instanceof Element && !this.hasAttribute('c-for')) {
				if (this.shadowRoot)
					this.mount(this.shadowRoot)
				this.mount()
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
