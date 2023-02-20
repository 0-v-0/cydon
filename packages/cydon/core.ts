/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { for_ } from './directives'
import { Constructor as Ctor, Data, getFunc } from './util'

function parse(s: string, attr = '') {
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
		deps, func: getFunc(attr ? 'let $v=`' + vals +
			`\`;if($v!=$e.getAttribute("${attr}"))$e.setAttribute("${attr}",$v)` :
			'return`' + vals + '`')
	}
}

/**
 * update a node
 * @param target
 */
function update({ node, data, func }: Target) {
	if (node.nodeType == 3)
		(<Text>node).data = (<Func>func).call(data, <Element>node.parentNode)
	else
		(<Func>func).call(data, <Element>node)
}

export type Part = {
	deps?: Set<string>
	func: Target['func']
}

export type AttrPart = Part & { keep?: boolean }

export type Func = (this: Data, el: Element) => string

export type Target = {
	node: Text | Element
	deps?: Set<string>
	data: Data
	func: Func | ((this: Data, el: Element) => void)
}

type DF = DocumentFragment

/** template result */
export type Result = Partial<Part> & {
	a?: Map<string, AttrPart> // attributes
	r?: Results
	s?: DF // shadow root
	e?: string[] // [value, key, index]
} | number

export type Results = Result[]

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Directive = {
	deps?: Set<string>
	func?: Target['func']
	keep?: boolean
}

export type DirectiveHandler =
	(attr: DOMAttr, attrs: Map<string, AttrPart>) => Directive | void

export const directives: DirectiveHandler[] = []

const proxies = new WeakMap<Set<string>, ProxyHandler<Data>>()

export const CydonOf = <T extends {}>(base: Ctor<T> = <any>Object) => {

	class Mixin extends (<Ctor<Object>>base) {
		[s: symbol]: any

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

		_parent?: Data

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			this.setData(data)
		}

		setData(data: Data = this) {
			this.data = new Proxy(this.$data = data, {
				set: (obj, key: string, val, receiver) => {
					// when setting a property that doesn't exist on current scope,
					// do not create it on the current scope and fallback to parent scope.
					const r = this._parent && !obj.hasOwnProperty(key) ?
						Reflect.set(this._parent, key, val) : Reflect.set(obj, key, val, receiver)
					this.updateValue(key)
					return r
				}
			})
		}

		compile(results: Results, el: Element | DF, level = 0, i = 0) {
			let result: Result | undefined
			if (level) {
				const map = new Map<string, AttrPart>()
				const attrs = (<Element>el).attributes
				// Find pattern in attributes
				if (attrs) {
					const exp = attrs[<any>'c-for']
					if (exp) {
						const val = exp.value
						if (val) {
							const [key, value] = val.split(';')
							if (import.meta.env.DEV && !value) {
								console.warn('invalid v-for expression: ' + val)
								return
							}
							const r: Results = []
								; (<HTMLElement>el).innerHTML = (<HTMLElement>el).innerHTML.trim()
							this.compile(r, (<HTMLTemplateElement>el).content)
							results.push(level << 22 | i,
								{ r, e: [value.trim(), ...key.split(/\s*,\s*/)] })
						}
						return
					}

					next: for (let i = 0; i < attrs.length;) {
						const attr = <DOMAttr>attrs[i]
						const name = attr.name
						for (const handler of directives) {
							const data = handler(attr, map)
							if (data) {
								map.set(name, <AttrPart>data)
								if (data.keep)
									++i
								else
									(<Element>el).removeAttribute(name)
								continue next
							}
						}
						const parts = parse(attr.value, name)
						if (parts)
							map.set(name, parts)
						++i
					}
					if (map.size)
						results.push(level << 22 | i, result = { a: map })
					if ((<Element>el).tagName.includes('-'))
						return
				}
			}
			const s = (<Element>el).shadowRoot
			if (s) {
				const r: Results = []
				this.compile(r, s)
				results.push(level << 22 | i, result = { r, s })
			}
			let node: Node | null = el.firstChild
			if (node && !result)
				results.push(level << 22 | i)
			level++
			for (let i = 0; node; node = node.nextSibling) {
				if (node.nodeType == 1/* Node.ELEMENT_NODE */)
					this.compile(results, <Element>node, level, i)
				if (node.nodeType == 3/* Node.TEXT_NODE */) {
					const parts = parse((<Text>node).data)
					if (parts)
						results.push(level << 22 | i, parts)
				}
				i++
			}
		}

		bind(results: Results, el: Element | DF = <any>this) {
			let node: Node = el
			let l = 0, n = 0, stack = []
			for (let i = 0, len = results.length; i < len; ++i) {
				const result = results[i]
				if (typeof result == 'object') {
					const { a: attrs, r: res, s } = result
					if (s) {
						let shadow = (<Element>node).shadowRoot
						if (!shadow) {
							shadow = (<Element>node).attachShadow({ mode: 'open' })
							s.childNodes.forEach(c => shadow!.append(c.cloneNode(true)))
						}
						this.bind(res!, shadow)
					} else if (res) {
						const p = node.parentNode!
						for_(this, <HTMLTemplateElement>node, res, result.e!)
						node = p
						n = stack.pop()!
						l--
					}
					if (result.func)
						this.addPart(<Text>node, <Part>result)
					else if (attrs)
						for (const part of attrs.values())
							this.addPart(<Element>node, part)
				} else if (i) {
					let index = result
					const level = index >>> 22
					index &= 4194303
					if (level > l) {
						stack.push(n)
						n = 0
						node = node.firstChild!
						l = level
					} else for (; level < l; l--) {
						node = node.parentNode!
						n = stack.pop()!
					}
					for (; n < index; n++) node = node.nextSibling!
				}
			}
		}

		mount(el: Element | DF = <any>this) {
			const results: Results = []
			this.compile(results, el)
			this.bind(results, el)
			this.commit()
		}

		addPart(node: Target['node'], part: Part) {
			const target: Target = Object.create(part)
			const deps = part.deps
			target.node = node
			let proxy: ProxyHandler<Data> | undefined
			if (deps) {
				proxy = proxies.get(deps)
				if (!proxy) {
					proxy = {
						get: (obj, key, receiver) => {
							if (typeof key == 'string') {
								if (this.deps && !obj.hasOwnProperty(key))
									this.deps.add(key)
								deps.add(key)
							}
							return Reflect.get(obj, key, receiver)
						}
					}
					proxies.set(deps, proxy)
				}
				this.targets.add(target)
				this.queue.add(target)
			}
			target.data = deps ? new Proxy(this.$data, proxy!) : this.data
			if (!deps)
				update(target)
		}

		/**
		 * unmount an element
		 * @param el target element
		 */
		unmount(el: Element | DF = <any>this) {
			for (const target of this.targets) {
				if (el.contains(target.node))
					this.targets.delete(target)
			}
		}

		/**
		 * update all nodes with specific variable
		 * @param prop variable
		 */
		updateValue(prop: string) {
			if (this.queue.size == 0)
				queueMicrotask(() => this.commit())
			this.queue.add(prop)
			this.onUpdate?.(prop)
		}

		/**
		 * update queued nodes immediately and clear queue
		 */
		commit() {
			for (const target of this.targets) {
				if (this.queue.has(target))
					update(target)
				else
					for (const prop of this.queue) {
						if (typeof prop == 'string' && target.deps?.has(prop)) {
							update(target)
							break
						}
					}
			}
			this.queue.clear()
		}

		connectedCallback() {
			if (this instanceof Element)
				this.mount()
		}
	}
	return <new (data?: Data, ...args: any[]) => T & Mixin>Mixin
}

/**
 * Base element class that manages element properties and attributes.
 */
export const CydonElement = CydonOf(HTMLElement)

export type CydonElement = InstanceType<typeof CydonElement>

export const Cydon = CydonOf()

export type Cydon = InstanceType<typeof Cydon>
