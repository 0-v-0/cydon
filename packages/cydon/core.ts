/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { directives as d, for_ } from './directives'
import { Constructor as Ctor, Data, Dep, DOMAttr, Part, Result, Target } from './type'
import { getFunc } from './util'

function parse(s: string, attr = '') {
	const re = /(\$\{[\S\s]+?})|\$([_a-z]\w*)/gi
	let a = re.exec(s), lastIndex!: number
	if (!a)
		return null

	let vals = ''
	for (; a; a = re.exec(s)) {
		const [match, expr, prop] = a,
			start = re.lastIndex - match.length
		if (start)
			vals += s.substring(lastIndex, start).replace(/`/g, '\\`')
		vals += expr || '${' + prop + '}'
		lastIndex = re.lastIndex
	}
	if (lastIndex < s.length)
		vals += s.substring(lastIndex).replace(/`/g, '\\`')
	return {
		deps: new Set<string>,
		f: getFunc(attr ? 'let $v=`' + vals +
			`\`;if($v!=$e.getAttribute("${attr}"))$e.setAttribute("${attr}",$v)` :
			'return`' + vals + '`')
	}
}

/**
 * update a node
 * @param target
 */
function update({ node, data, f }: Target) {
	if (node.nodeType == 3/* Node.TEXT_NODE */)
		(<Text>node).data = f.call(data, <Element>node.parentNode)
	else
		f.call(data, <Element>node)
}

type DF = DocumentFragment

let map = new Map<string, Part>()
function compile(results: Result[], el: Element | DF, directives = d, level = 0, i = 0, parent?: ParentNode) {
	let result
	if (level) {
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
					const r: Result[] = []
					compile(r, (<HTMLTemplateElement>el).content, directives, 0, 0, el.parentNode!)
					results.push(level << 22 | i,
						{ r, e: [value.trim(), ...key.split(/\s*,\s*/)] })
				}
				return
			}

			next: for (let i = 0; i < attrs.length;) {
				const attr = <DOMAttr>attrs[i]
				const name = attr.name
				for (const handler of directives) {
					const data = handler(attr, map, parent)
					if (data) {
						map.set(name, <Part>data)
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
			if (map.size) {
				results.push(level << 22 | i, result = { a: map })
				map = new Map
			}
			if (customElements.get((<Element>el).tagName.toLowerCase())?.prototype.updateValue)
				return
		}
	}
	const s = (<Element>el).shadowRoot
	if (s) {
		const r: Result[] = []
		compile(r, s, directives, 0, 0, parent)
		results.push(level << 22 | i, result = { r, s })
	}
	let node: Node | null = el.firstChild
	if (node && !result)
		results.push(level << 22 | i)
	level++
	for (i = 0; node; node = node.nextSibling) {
		if (node.nodeType == 1/* Node.ELEMENT_NODE */)
			compile(results, <Element>node, directives, level, i, parent)
		if (node.nodeType == 3/* Node.TEXT_NODE */) {
			const parts = parse((<Text>node).data)
			if (parts)
				results.push(level << 22 | i, parts)
		}
		i++
	}
}

const proxies = new WeakMap<Dep, ProxyHandler<Data>>()
const queue = new WeakSet<Data>()

export const CydonOf = <T extends {}>(base: Ctor<T> = <any>Object) => {

	class Mixin extends (<Ctor<{ connectedCallback?(): void }>>base) {
		[s: symbol]: any

		/**
		 * raw data object
		 */
		$data!: Data

		/**
		 * reactive data object
		 */
		data!: Data

		queue = new Set<string>

		/**
		 * bound nodes
		 */
		targets: Target[] = []

		_parent?: Data

		/**
		 * directives
		 */
		directives = d

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			this.setData(data)
		}

		setData(data: Data = this, parent?: Data) {
			this.data = new Proxy(this.$data = data, {
				get: (obj, key: string) => obj[key],
				set: (obj, key: string, val, receiver) => {
					if (val == obj[key])
						return true

					// when setting a property that doesn't exist on current scope,
					// do not create it on the current scope and fallback to parent scope.
					const r = this._parent && !obj.hasOwnProperty(key) ?
						Reflect.set(this._parent, key, val) : Reflect.set(obj, key, val, receiver)
					this.updateValue(key)
					return r
				}
			})
			this._parent = parent
		}

		bind(results: Result[], el: Element | DF = <any>this) {
			let node: Node = el
			let l = 0, n = 0, stack = []
			for (let i = 1, len = results.length; i < len; ++i) {
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
					if (result.f)
						this.addPart(<Text>node, <Part>result)
					else if (attrs)
						for (const [, part] of attrs)
							this.addPart(<Element>node, part)
				} else {
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
					for (; n < index; n++)
						node = node.nextSibling!
				}
			}
		}

		mount(el: Element | DF = <any>this) {
			const results: Result[] = []
			compile(results, el)
			this.bind(results, el)
		}

		addPart(node: Target['node'], part: Part) {
			const target: Target = Object.create(part)
			target.node = node
			let proxy: ProxyHandler<Data> | undefined
			const deps = part.deps
			if (deps) {
				proxy = proxies.get(deps)
				if (!proxy)
					proxies.set(deps, proxy = {
						get: (obj, key, receiver) => {
							if (typeof key == 'string') {
								deps.add(key)
							}
							return Reflect.get(obj, key, receiver)
						}
					})
				this.targets.push(target)
			}
			target.data = deps ? new Proxy(this.$data, proxy!) : this.data
			update(target)
		}

		/**
		 * unmount an element
		 * @param el target element, null means clean unconnected nodes
		 */
		unmount(el: Element | DF | null = <any>this) {
			const targets = this.targets
			for (let i = 0; i < targets.length;) {
				const node = targets[i].node
				if (el ? el.contains(node) : !node.isConnected)
					targets.splice(i, 1)
				else
					i++
			}
		}

		/**
		 * update all nodes with specific variable
		 * @param prop variable
		 */
		updateValue(prop: string) {
			if (!this.queue.size) {
				const data = this._parent ?? this.$data
				if (!queue.has(data)) {
					queueMicrotask(() => {
						this.commit()
						queue.delete(data)
					})
					queue.add(data)
				}
			}
			this.queue.add(prop)
		}

		/**
		 * update queued nodes immediately and clear queue
		 */
		commit() {
			const q = this.queue
			for (const target of this.targets) {
				for (const dep of target.deps) {
					if (q.has(dep)) {
						update(target)
						break
					}
				}
			}
			q.clear()
		}

		connectedCallback() {
			if (this instanceof Element) {
				super.connectedCallback?.()
				this.mount()
			}
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
