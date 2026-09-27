/*
 * Cydon v0.1.9
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
function update({ a, n: node, x: data, f }: Target) {
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

/** data proxies */
const proxies = new WeakMap<Dep | Data, Handler>()

export function setData(cydon: Cydon, data: Data = cydon, parent?: Data) {
	let proxy = proxies.get(parent!)
	if (!proxy) {
		proxy = {
			get: (obj, key: string) => obj[key],
			set(obj, key: string, val, receiver) {
				const hasOwn = Object.hasOwn(obj, key)
				if (hasOwn && val === obj[key])
					return true

				// when setting a property that doesn't exist on current scope,
				// do not create it on the current scope and fallback to parent scope.
				const r = parent && !hasOwn && receiver === cydon.data ?
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

export const CydonOf = <T extends {}, D extends Data = Data>(base: Ctor<T> = <any>Object) => {

	class Mixin extends (<Ctor<{ connectedCallback?(): void }>>base) {
		/**
		 * raw data object
		 */
		$data!: D

		/**
		 * reactive data object
		 */
		data!: D

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

		constructor(data?: D, ...args: ConstructorParameters<Ctor<T>>) {
			super(...args)
			setData(this, data as Data)
		}

		bind(results: Results, container: Container = <any>this) {
			let node: Node | null = container,
				l = 0, n = 0
			// ps[l]: parent node holding the level-l nodes; ns[l]: the index
			// ps[l] itself was positioned at. Navigation steps over sibling
			// gaps while the current node is still attached (intact stretches),
			// and falls back to an absolute ps[l].childNodes.item(index) lookup
			// otherwise, so a node detached mid-walk (e.g. by c-if swapping
			// itself for its anchor) cannot derail the walk like a plain
			// nextSibling chain starting from a detached node would.
			const ps: (Node | null)[] = [], ns: number[] = []
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
						} else if (node) {
							for_(this, <HTMLTemplateElement>node, result)
							// keep node/l: following results are the template's own
							// siblings, resolved via ps[l]
						} else
							import.meta.env.DEV && console.warn('[cydon] c-for skipped: no template node while binding — the DOM was mutated after compile', result)
					} else if (node) {
						if ((<Part>result).f)
							this.bindNode(<Text>node, <Part>result)
						else for (const [, part] of <AttrMap>result)
							this.bindNode(<Element>node, part)
					} else
						import.meta.env.DEV && console.warn('[cydon] bindings skipped: no matching DOM node while binding — the DOM was mutated after compile', result)
				} else {
					const level = result >>> 22
					result &= 4194303 // index
					if (level > l) {
						// the positioned node parents the deeper level: descend to
						// its first child, recording its index so the walk can step
						// back onto it when ascending
						ps[level] = node
						ns[level] = n
						l = level
						node = node && node.firstChild
						n = 0
					} else if (level < l) {
						// ps[level + 1] is the ancestor positioned at `level`
						node = ps[level + 1] ?? null
						n = ns[level + 1] ?? NaN
						l = level
					}
					if (result != n) {
						const parent = ps[l]
						// fast path: intact DOM, step over the compiled gap. Mid-walk
						// mutations never shift sibling indices (c-if swaps 1:1 with
						// its anchor, c-for only appends, c-tp defers), so stepping
						// is safe whenever the current node is still attached.
						if (result > n && node?.parentNode == parent)
							for (let i = n; i < result && node; i++)
								node = node.nextSibling
						else
							node = parent ? <Node | null>parent.childNodes.item(result) : null
						n = result
					}
				}
			}
		}

		/**
		 * bind a node with specific part and update it
		 * @param node node to bind
		 * @param part
		 * @returns target object
		 */
		bindNode(node: Target['n'], part: Part) {
			const target: Target = Object.create(part)
			target.n = node
			let proxy: Handler | undefined
			const deps = part.deps
			if (deps) {
				proxy = proxies.get(deps)
				if (!proxy)
					proxies.set(deps, proxy = {
						get(obj, key, receiver) {
							if (typeof key == 'string')
								deps.add(key)
							return Reflect.get(obj, key, receiver)
						}
					})
				this.$targets.add(target)
			}
			target.x = deps ? new Proxy(this.$data, proxy!) : this.data
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
				const node = target.n
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
	return <new (data?: D, ...args: any[]) => T & Mixin>Mixin
}

/**
 * Base element class that manages element properties and attributes.
 */
export const CydonElement = CydonOf(HTMLElement)

export type CydonElement = InstanceType<typeof CydonElement>

type CydonBase<T extends {}, D extends Data = Data> = InstanceType<ReturnType<typeof CydonOf<T, D>>>

/** Generic Cydon constructor - allows `new Cydon<MyType>(data)` for typed data */
interface CydonCtor {
	new <D extends Data = Data>(data?: D): CydonBase<{}, D>
}

export const Cydon = CydonOf() as CydonCtor

export type Cydon<T extends {} = {}, D extends Data = Data> = CydonBase<T, D>
