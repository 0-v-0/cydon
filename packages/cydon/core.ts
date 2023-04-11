/*
 * Cydon v0.1.0
 * https://github.com/0-v-0/cydon
 */

import { compile } from './compiler'
import { directives as d, for_ } from './directives'
import {
	AttrMap, Constructor as Ctor, Data, DataHandler as Handler,
	Dep, Part, Results, Target, Container
} from './type'

/**
 * update a node
 * @param target
 * @returns whether the node has been updated
 */
function update({ a, node, data, f }: Target) {
	let val: string
	if (node.nodeType == 3/* Node.TEXT_NODE */) {
		val = f.call(data, <Element>node.parentNode)
		return val != (<Text>node).data &&
			((<Text>node).data = val, true)
	} else {
		val = f.call(data, <Element>node)
		return a && val != (<Element>node).getAttribute(a) &&
			!<undefined>(<Element>node).setAttribute(a, val)
	}
}

const proxies = new WeakMap<Dep | Data, Handler>()

export function setData(cydon: Cydon, data: Data = cydon, parent?: Data) {
	let proxy = proxies.get(parent!)
	if (!proxy) {
		proxy = {
			get: (obj, key: string) => obj[key],
			set: (obj, key: string, val, receiver) => {
				const hasOwn = obj.hasOwnProperty(key)
				if (hasOwn && val == obj[key])
					return true

				// when setting a property that doesn't exist on current scope,
				// do not create it on the current scope and fallback to parent scope.
				const r = !hasOwn && parent ?
					Reflect.set(parent, key, val) :
					Reflect.set(obj, key, val, receiver)
				cydon.updateValue(key)
				return r
			}
		}
		if (parent)
			proxies.set(parent, proxy)
	}
	cydon.data = new Proxy(cydon.$data = data, proxy)
}

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
		$queue = new Map<string, number>

		/**
		 * bound nodes
		 */
		$targets = new Set<Target>

		/**
		 * max number of updates of a property per commit
		 */
		$limits = new Map<string, number>

		/**
		 * directives
		 */
		$directives = d

		constructor(data?: Data, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			setData(this, data)
		}

		bind(results: Results, container: Container = <any>this) {
			let node: Node = container,
				l = 0, n = 0, stack: number[] = []
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
		 * bind a node with specific part and update it
		 * @param node node to bind
		 * @param part
		 * @returns target object
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
							if (typeof key == 'string')
								deps.add(key)
							return Reflect.get(obj, key, receiver)
						}
					})
				this.$targets.add(target)
			}
			target.data = deps ? new Proxy(this.$data, proxy!) : this.data
			update(target)
			return target
		}

		/**
		 * mount the instance in a container element
		 * @param container container element
		 */
		mount(container: Container = <any>this) {
			const results: Results = []
			compile(results, container, this.$directives)
			this.bind(results, container)
		}

		/**
		 * unmount an element
		 * @param el target element, null means clean unconnected nodes
		 */
		unmount(el: Container | null = <any>this) {
			const targets = this.$targets
			for (const target of targets) {
				const node = target.node
				if (el ? el.contains(node) : !node.isConnected)
					targets.delete(target)
			}
		}

		/**
		 * enqueue all nodes with given variable
		 * @param prop variable
		 */
		updateValue(prop: string) {
			if (!this.$queue.size)
				queueMicrotask(() => this.commit())
			this.$queue.set(prop, 1)
		}

		/**
		 * update nodes immediately and clear queue
		 */
		commit() {
			const q = this.$queue
			for (const target of this.$targets) {
				for (const dep of target.deps) {
					const count = q.get(dep)
					if (count) {
						// target.deps.clear()
						if (update(target)) {
							if (count == this.$limits.get(dep))
								q.delete(dep)
							else
								q.set(dep, count + 1)
						}
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
