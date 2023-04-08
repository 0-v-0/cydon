/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { directives as d, for_ } from './directives'
import {
	AttrMap, Constructor as Ctor, Data, DataHandler as Handler,
	Dep, DOMAttr, Part, Result, Results, Target
} from './type'
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
export function compile(results: Results, el: Element | DF, directives = d, level = 0, i = 0, parent?: ParentNode) {
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
					const r: Result = []
					compile(r, (<HTMLTemplateElement>el).content, directives, 0, 0, el.parentNode!)
					r.e = [value.trim(), ...key.split(/\s*,\s*/)]
					results.push(level << 22 | i, r)
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
				results.push(level << 22 | i, result = map)
				map = new Map
			}
			if (customElements.get((<Element>el).tagName.toLowerCase())?.prototype.updateValue)
				return
		}
	}
	const s = (<Element>el).shadowRoot
	if (s) {
		const r: Result = []
		compile(r, s, directives, 0, 0, parent);
		r.s = s
		results.push(level << 22 | i, result = r)
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

const proxies = new WeakMap<Dep, Handler>()

export const CydonOf = <T extends {}>(base: Ctor<T> = <any>Object) => {

	class Mixin extends (<Ctor<{ connectedCallback?(): void }>>base) {
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
		_dirty = new Set<string>

		/**
		 * bound nodes
		 */
		_targets: Target[] = []

		_deps?: Set<string>

		_parent?: Data

		/**
		 * directives
		 */
		directives = d

		/**
		 * update callback
		 * @param prop prop name
		 */
		onUpdate?(prop: string): void

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			this.setData(data)
		}

		setData(data: Data = this, parent?: Data) {
			this.data = new Proxy(this.$data = data, {
				set: (obj, key: string, val, receiver) => {
					const hasOwn = obj.hasOwnProperty(key)
					if (hasOwn && val == obj[key])
						return true

					// when setting a property that doesn't exist on current scope,
					// do not create it on the current scope and fallback to parent scope.
					const r = !hasOwn && this._parent ?
						Reflect.set(this._parent, key, val) :
						Reflect.set(obj, key, val, receiver)
					this.updateValue(key)
					return r
				}
			})
			this._parent = parent
		}

		bind(results: Results, container: Element | DF = <any>this) {
			let node: Node = container
			let l = 0, n = 0, stack = []
			for (let i = 1, len = results.length; i < len; ++i) {
				let result = results[i]
				if (typeof result == 'object') {
					if (Array.isArray(result)) {
						if (result.s) {
							let shadow = (<Element>node).shadowRoot
							if (!shadow) {
								shadow = (<Element>node).attachShadow({ mode: 'open' })
								result.s.childNodes.forEach(c => shadow!.append(c.cloneNode(true)))
							}
							this.bind(result, shadow)
						} else {
							const p = node.parentNode!
							for_(this, <HTMLTemplateElement>node, result, result.e!)
							node = p
							n = stack.pop()!
							l--
						}
					} else if ((<Part>result).f)
						this.bindNode(<Text>node, <Part>result)
					else for (const [, part] of <AttrMap>result)
						this.bindNode(<Element>node, part)
				} else {
					const level = result >>> 22
					result &= 4194303 // index
					if (level > l) {
						stack.push(n)
						n = 0
						node = node.firstChild!
						l = level
					} else for (; level < l; l--) {
						node = node.parentNode!
						n = stack.pop()!
					}
					for (; n < result; n++)
						node = node.nextSibling!
				}
			}
		}

		/**
		 * mount the instance in a container element
		 * @param container container element
		 */
		mount(container: Element | DF = <any>this) {
			const results: Results = []
			compile(results, container)
			this.bind(results, container)
		}

		/**
		 * bind a node with specific part and update it
		 * @param node node to bind
		 * @param part
		 */
		bindNode(node: Target['node'], part: Part) {
			const target: Target = Object.create(part)
			target.node = node
			let proxy: Handler | undefined
			const deps = part.deps
			if (deps) {
				proxy = proxies.get(deps)
				if (!proxy)
					proxies.set(deps, proxy = {
						get: (obj, key, receiver) => {
							if (typeof key == 'string') {
								if (this._deps && !obj.hasOwnProperty(key))
									this._deps.add(key)
								deps.add(key)
							}
							return Reflect.get(obj, key, receiver)
						}
					})
				this._targets.push(target)
			}
			target.data = deps ? new Proxy(this.$data, proxy!) : this.data
			update(target)
		}

		/**
		 * unmount an element
		 * @param el target element, null means clean unconnected nodes
		 */
		unmount(el: Element | DF | null = <any>this) {
			const arr = this._targets
			for (let i = 0; i < arr.length;) {
				const node = arr[i].node
				if (el ? el.contains(node) : !node.isConnected)
					arr.splice(i, 1)
				else
					i++
			}
		}

		/**
		 * enqueue all nodes with given variable
		 * @param prop variable
		 */
		updateValue(prop: string) {
			if (!this._dirty.size)
				queueMicrotask(() => this.commit())
			this._dirty.add(prop)
			this.onUpdate?.(prop)
		}

		/**
		 * update nodes immediately and clear queue
		 */
		commit() {
			const q = this._dirty
			for (const target of this._targets) {
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
