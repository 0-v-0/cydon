import { Cydon, setData } from '../core'
import { Data, DataHandler, Directive, DirectiveHandler, Part, Results } from '../type'
import { toFunction } from '../util'
import event from './event'
export * from './event'

type Context = Cydon & Data
type D = Directive | void

/**
 * State of one c-for loop instance: its own scopes, capacity and DOM.
 * Everything array-related (the backing array and its proxy) lives on the
 * shared state below — loops over the same array field only own their scopes.
 *
 * Keyed loops (a `:key` expression on the template) implement the same two
 * entry points as no-ops that delegate to the shared batched flush, and add
 * reconcile(), which diffs their scopes against `shared.arr` by key.
 */
export interface ForLoop {
	ctxs: Context[]
	render(i: number): void
	setCapacity(n: number): void
	/** keyed loop: reconciles items by key instead of updating in place */
	keyed?: boolean
	reconcile?(): void
}

/**
 * Shared state of all c-for loops bound to the same (instance, array field).
 * A single accessor is defined per field name and fans writes out to every
 * registered loop, so two c-fors iterating the same array both stay live
 * instead of the later defineProperty silently replacing the earlier one.
 *
 * Note: direct index reads through the shared proxy (e.g. `${items[0].x}`
 * in an expression) resolve the item scope of the first registered loop.
 */
export interface ForLoops {
	arr: unknown[]
	items: any[]
	loops: ForLoop[]
	setArray(v: unknown[]): void
	/** whether a batched reconcile of the keyed loops is already scheduled */
	dirty?: boolean
	/** schedule one reconcile of every keyed loop on this field in a microtask */
	markDirty?(): void
}

/** Symbol key of the per-instance c-for state table, declared as a Mixin
 * field so it is visible from the Cydon class. A symbol key is not
 * enumerable, so Object.keys/spread/assign on a Cydon instance can't pick it
 * up or clobber it. */
export const forSharedKey = Symbol(import.meta.env.DEV ? 'cydon:forShared' : '')

/**
 * Indices of the longest strictly increasing subsequence of `arr`, via
 * patience sorting with predecessor links, O(n log n). `arr` must not
 * contain duplicate values (old scope indices are matched at most once).
 */
function getSequence(arr: number[]): number[] {
	const len = arr.length
	if (!len) return []
	const p: number[] = new Array(len)
	const result = [0]
	for (let i = 1; i < len; i++) {
		const v = arr[i],
			last = result[result.length - 1]
		if (arr[last] < v) {
			p[i] = last
			result.push(i)
			continue
		}
		let u = 0, w = result.length - 1
		while (u < w) {
			const m = (u + w) >> 1
			if (arr[result[m]] < v) u = m + 1
			else w = m
		}
		if (v < arr[result[u]]) {
			if (u > 0) p[i] = result[u - 1]
			result[u] = i
		}
	}
	let v = result[result.length - 1]
	for (let i = result.length - 1; i >= 0; i--) {
		result[i] = v
		v = p[v]!
	}
	return result
}

export function for_(cydon: Cydon, el: HTMLTemplateElement, results: Results & { e?: string[] }) {
	if (import.meta.env.DEV && el.tagName != 'TEMPLATE') {
		console.warn('c-for can only be used on <template> element')
		return
	}
	const [value, key, index] = results.e!
	const data = cydon.$data
	const initial = data[value]
	if (!Array.isArray(initial)) {
		if (import.meta.env.DEV)
			console.warn(`c-for: '${value}' is not an array`)
		return
	}
	const parent = el.parentNode!
	const content = el.content
	// A `:key` expression on the template switches the loop to keyed mode.
	// The template keeps the attribute until removal: compile() returns
	// before scanning a c-for element's own attributes, so no directive
	// ever strips it.
	const keyExpr = el.getAttribute(':key')
	if (import.meta.env.DEV && keyExpr != null && !keyExpr)
		console.warn('c-for: empty :key expression; rendering non-keyed instead', el)
	// The node following the template, resolving the insert anchor for keyed
	// reconciliations; null when the template is the last child. The template
	// itself is never a valid anchor (it leaves the DOM), and neither is a
	// node a later template removed — revalidated before every use.
	const endAnchor = el.nextSibling
	// Defer removing the template until after bind: sibling indices recorded by
	// compile() must stay valid for the rest of the bind walk, so the template
	// must not leave the DOM while bind is still walking its siblings.
	queueMicrotask(() => el.remove())

	const forMap = cydon[forSharedKey] ??= new Map<string, ForLoops>()
	let shared = forMap.get(value)
	if (!shared) {
		const handler: ProxyHandler<any> = {
			get: (obj, p) => typeof p == 'string' && +p == <any>p &&
				shared!.loops[0]?.ctxs[<any>p]?.$data[key] || obj[p],
			set(obj, p, val) {
				if (p == 'length') {
					obj.length = +val
					for (const l of shared!.loops)
						l.setCapacity(+val)
				} else {
					obj[p] = val
					if (typeof p == 'string' && +p == <any>p) {
						const n = +p
						for (const l of shared!.loops) {
							if (n >= l.ctxs.length)
								l.setCapacity(n + 1)
							else
								l.render(n)
						}
					}
				}
				cydon.updateValue(value)
				return true
			},
		}
		forMap.set(value, shared = {
			arr: initial,
			items: new Proxy(initial, handler),
			loops: [],
			dirty: false,
			markDirty() {
				if (this.dirty) return
				this.dirty = true
				// Keyed reconciliation is batched: a swap is two index writes,
				// and diffing the intermediate state would destroy and recreate
				// the swapped items instead of moving them.
				queueMicrotask(() => {
					this.dirty = false
					for (const l of this.loops)
						if (l.keyed) l.reconcile!()
				})
			},
			setArray(v) {
				if (v != this.items) {
					const len = Math.min(this.arr.length, v.length)
					this.arr = v
					for (const l of this.loops)
						if (l.keyed)
							this.markDirty!()
						else
							for (let i = 0; i < len; i++)
								if (l.ctxs[i]?.$data[key] != v[i])
									l.render(i)
					this.items = new Proxy(v, handler)
					this.items.length = v.length
				}
			},
		})
		Object.defineProperty(cydon, value, {
			get: () => shared!.items,
			set: (v) => shared!.setArray(v),
			configurable: true,
		})
	}

	// ---- shared per-loop state: item proxy handler and ownership mark ----
	const ph: DataHandler = {
		set: (obj, p: string, val) => {
			obj[p] = val
			cydon.updateValue(key)
			cydon.updateValue(value)
			return true
		}
	}
	const own = Symbol(import.meta.env.DEV ? 'cydon:forOwn' : '')

	/**
	 * Write the item's data into a scope: objects get a proxied copy that is
	 * updated in place on re-render, primitives are assigned directly.
	 */
	const updateScope = (c: Context, item: any) => {
		if (typeof item == 'object') {
			if (c.$data[key])
				Object.assign(c.$data[key], item) // update data
			else
				c.$data[key] = new Proxy({ ...item }, ph)
		} else {
			c.$data[key] = item
			cydon.updateValue(key)
			cydon.updateValue(value)
		}
	}

	if (keyExpr) {
		// ---- keyed mode: scopes track items by key and the DOM follows ----
		// key expressions evaluate against the item scope, without the node
		// argument binding functions receive
		const keyFn = toFunction('return ' + keyExpr) as (this: Data) => any
		const ctxs: Context[] = []
		const markers: Comment[] = []
		const keys: any[] = []
		// the item object each scope was last rendered from, to skip no-op updates
		const rendered: unknown[] = []
		// top-level node count of one item. A leading comment marker per item
		// makes the range walkable by count, which survives a c-if inside the
		// template swapping its element for an anchor comment 1:1.
		const width = content.childNodes.length

		const keyOf = (item: any, i: number) => {
			// evaluate in a throwaway scope proto-linked to the parent data, so
			// key expressions can read the item, the index and outer data alike
			const s: Data = Object.create(data)
			s[key] = item
			if (index) s[index] = i
			return keyFn.call(s)
		}

		/** create the scope and DOM of a new item, inserted before anchor */
		const createItem = (i: number, item: any, k: any, anchor: Node | null) => {
			const marker = document.createComment(import.meta.env.DEV ? 'c-for' : '')
			marker[own] = true
			// importNode, not cloneNode: the clone is created in the main
			// document, where already-defined custom elements upgrade
			// synchronously — before bind. Cloning in the template content's
			// document (no custom element registry) defers the upgrade to
			// insertion, after bind, so property bindings written by bind
			// would land before the accessors exist and shadow them.
			const target = document.importNode(content, true)
			const c: Context = ctxs[i] = Object.create(cydon)
			// the item's data object proto-links to the parent data: the
			// scope chain (item -> outer items -> root data) is then carried
			// by ordinary prototype lookup, in reads and in `with` has checks
			setData(c, Object.create(data), data)
			if (index)
				c.$data[index] = i
			updateScope(c, item)
			c.bind(results, target)
			for (let node = target.firstChild; node; node = node.nextSibling)
				node[own] = true
			parent.insertBefore(marker, anchor)
			parent.insertBefore(target, anchor)
			markers[i] = marker
			keys[i] = k
			rendered[i] = item
		}

		/** remove the marker and the `width` nodes of one item */
		const removeItem = (marker: Comment) => {
			let node: ChildNode | null = marker
			for (let j = 0; j <= width && node; j++) {
				const next: ChildNode | null = node.nextSibling
				node.remove()
				node = next
			}
		}

		const reconcile = () => {
			const arr = shared.arr, n = arr.length, oldN = ctxs.length
			if (!n && !oldN) return
			const oCtxs = ctxs.slice(), oMarkers = markers.slice(),
				oKeys = keys.slice(), oRendered = rendered.slice()

			// match old scopes to new items by key; an old scope feeds at most
			// one new position, surplus occurrences of a key render as new items
			const oldByKey = new Map<any, number>()
			for (let i = 0; i < oldN; i++) {
				const k = oKeys[i]
				if (!oldByKey.has(k)) oldByKey.set(k, i)
			}
			const match: number[] = new Array(n).fill(-1)
			const consumed = new Uint8Array(oldN)
			const newKeys: any[] = new Array(n)
			const warned = import.meta.env.DEV && new Set<any>()
			for (let i = 0; i < n; i++) {
				const k = newKeys[i] = keyOf(arr[i], i)
				if (warned) {
					if (warned.has(k))
						console.warn(`c-for: duplicate key ${String(k)} in '${value}'; every item after the first renders as a new item`, el)
					else
						warned.add(k)
				}
				const oi = oldByKey.get(k)
				if (oi != null && !consumed[oi]) {
					match[i] = oi
					consumed[oi] = 1
				}
			}

			// scopes whose old indices form the longest increasing subsequence
			// of the matched order are already in DOM order and stay put; the
			// remaining matched scopes are moved exactly once
			const pos: number[] = [], oldIdx: number[] = []
			for (let i = 0; i < n; i++)
				if (match[i] >= 0) {
					pos.push(i)
					oldIdx.push(match[i])
				}
			const noMove = new Uint8Array(n)
			for (const j of getSequence(oldIdx))
				noMove[pos[j]] = 1

			// the node following the loop's region, captured before removals
			// shift it: the last old item's nodes plus its marker
			let tail: ChildNode | null = null
			if (oldN) {
				tail = oMarkers[oldN - 1]
				for (let j = 0; j <= width && tail; j++)
					tail = tail.nextSibling
			} else if (endAnchor && endAnchor.parentNode == parent)
				tail = endAnchor

			// removals first, so moves never step over stale nodes
			let removed = 0
			for (let i = 0; i < oldN; i++)
				if (!consumed[i]) {
					removed++
					removeItem(oMarkers[i])
				}
			if (removed) {
				requestIdleCallback(() => cydon.unmount(null))
				if (removed == oldN) {
					// destructive fast path: every old item is gone and nothing
					// but this loop's nodes (and whitespace) remains, so drop
					// them all at once instead of per item
					let onlyOwn = true
					for (let node = parent.firstChild; node; node = node.nextSibling) {
						if (!node[own] && !(node.nodeType == 3 && !(<Text>node).data.trim())) {
							onlyOwn = false
							break
						}
					}
					if (onlyOwn)
						parent.textContent = ''
				}
			}

			// walk the new order backwards, anchoring each item before the
			// already-placed successor; scopes on the LIS keep their nodes
			let anchor = tail && tail.parentNode == parent ? tail : null
			ctxs.length = markers.length = keys.length = rendered.length = n
			for (let i = n - 1; i >= 0; i--) {
				const item = arr[i], oi = match[i]
				if (oi < 0) {
					createItem(i, item, newKeys[i], anchor)
					anchor = markers[i]
				} else {
					const marker = oMarkers[oi]
					if (!noMove[i]) {
						let node: ChildNode | null = marker
						for (let j = 0; j <= width && node; j++) {
							const next: ChildNode | null = node.nextSibling
							parent.insertBefore(node, anchor)
							node = next
						}
					}
					anchor = marker
					ctxs[i] = oCtxs[oi]
					markers[i] = marker
					keys[i] = oKeys[oi]
					rendered[i] = item
					if (oRendered[oi] !== item)
						updateScope(oCtxs[oi], item)
				}
			}

			// positions shifted: refresh the index variable of every scope
			if (index) {
				let changed = false
				for (let i = 0; i < n; i++)
					if (ctxs[i].$data[index] != i) {
						ctxs[i].$data[index] = i
						changed = true
					}
				if (changed)
					cydon.updateValue(index)
			}
		}

		const markDirty = () => shared.markDirty!()
		shared.loops.push({
			ctxs, keyed: true,
			render: markDirty, setCapacity: markDirty,
			reconcile,
		})
		// initial render appends: inserting before the template would shift
		// the sibling indices the running bind walk still has to consume
		const arr = shared.arr
		for (let i = 0; i < arr.length; i++)
			createItem(i, arr[i], keyOf(arr[i], i), null)
		return
	}

	// ---- non-keyed mode (default): scopes follow positions, tail capacity ----
	const ctxs: Context[] = []
	let capacity = 0
	const render = (i: number) =>
		updateScope(ctxs[i], shared.arr[i])
	/**
	 * Sets the capacity of the parent element to display the given number of items.
	 * If capacity > the current number of items, new elements are created and added to the parent.
	 * If capacity < the current number of items, excess elements are removed from the parent.
	 * If capacity = 0, all rendered elements are removed from the parent.
	 * Only nodes rendered by this loop are ever removed — static siblings are untouched.
	 * @param n The desired capacity of the parent element.
	 */
	const setCapacity = (n: number) => {
		if (n) {
			for (; capacity < n; ++capacity) {
				// importNode, not cloneNode: the clone is created in the main
				// document, where already-defined custom elements upgrade
				// synchronously — before bind. Cloning in the template content's
				// document (no custom element registry) defers the upgrade to
				// insertion, after bind, so property bindings written by bind
				// would land before the accessors exist and shadow them.
				const target = document.importNode(content, true)
				const c: Context = ctxs[capacity] = Object.create(cydon)
				// the item's data object proto-links to the parent data: the
				// scope chain (item -> outer items -> root data) is then carried
				// by ordinary prototype lookup, in reads and in `with` has checks
				setData(c, Object.create(data), data)
				if (index)
					c.$data[index] = capacity
				render(capacity)
				c.bind(results, target)
				for (let node = target.firstChild; node; node = node.nextSibling)
					node[own] = true
				parent.appendChild(target)
			}
			if (capacity > n) {
				let k = (capacity - n) * content.childNodes.length
				let node = parent.lastChild
				while (node && k > 0) {
					const prev = node.previousSibling
					if (node[own]) {
						node.remove()
						--k
					}
					node = prev
				}
				requestIdleCallback(() => cydon.unmount(null))
				capacity = n
			}
		} else { // clear: remove only the elements rendered by this loop
			let onlyOwn = true
			for (let node = parent.firstChild; node; node = node.nextSibling) {
				if (!node[own] && !(node.nodeType == 3 && !(node as Text).data.trim())) {
					onlyOwn = false
					break
				}
			}
			if (onlyOwn)
				parent.textContent = ''
			else {
				let node = parent.lastChild
				while (node) {
					const prev = node.previousSibling
					if (node[own])
						node.remove()
					node = prev
				}
			}
			requestIdleCallback(() => cydon.unmount(null))
			capacity = 0
		}
		ctxs.length = n
	}

	shared.loops.push({ ctxs, render, setCapacity })
	setCapacity(shared.arr.length)
}

export const directives: DirectiveHandler[] = [
	event,
	(name, value): D => {
		if (name == 'ref')
			return {
				f(el) {
					if (import.meta.env.DEV && value in this.$data)
						console.warn(`The ref "${value}" has already defined on`, this.$data)
					this.$data[value] = el
				}
			}
		if (name[0] == '$') { // dynamic attribute name
			name = name.substring(1)
			let attrName: string
			return {
				deps: new Set,
				f(el) {
					if (attrName) {
						const newName = this.data[name]
						if (newName != attrName) {
							el.removeAttribute(attrName)
							if (newName)
								el.setAttribute(newName, value)
						}
					} else {
						attrName = this.data[name]
						el.setAttribute(attrName, value)
					}
				}
			}
		}
		if (name[0] == '.') { // bind DOM property
			name = name.substring(1)
			const func = toFunction('return ' + value)
			return {
				deps: new Set,
				f(el: Data & Element) {
					el[name] = func.call(this, el)
					el.updateValue?.(name)
				}
			}
		}
	},
	/**
	 * A simple utility for conditionally joining attributes like classNames together
	 *
	 * e.g. :class="a:cond1;b:cond2"
	 * cond1 & cond2 is true:	class="a b"
	 * cond1 is true:			class="a"
	 * cond2 is true:			class="b"
	 * neither is true:			class=""
	 *
	 * NOTE: This differs from Vue
	 */
	(name, value, el, attrs): D => {
		if (name[0] == ':') {
			name = name.substring(1)
			if (!name)
				return {
					deps: new Set,
					f: toFunction(value)
				}

			el.removeAttribute(':' + name)
			let code = `let $v="${el.getAttribute(name) ?? ''}";`
			for (const cls of value.split(';')) {
				let key = cls,
					val = cls
				const p = cls.indexOf(':')
				if (~p) {
					key = cls.substring(0, p)
					val = cls.substring(p + 1)
				}
				code += `if(${val.trim()})$v+=" ${key.trim()}";`
			}
			let attr = attrs.get(name)
			if (!attr)
				attrs.set(name, attr = <Part>{ a: name, deps: new Set })
			attr.f = toFunction(code + `return $v`)
		}
	}
]

declare namespace globalThis {
	// ambient: read back via globalThis.CYDON_NO_EXTRA below and settable from host pages
	// oxlint-disable-next-line no-unused-vars
	const CYDON_NO_EXTRA: boolean | undefined
}

import extra from './extra'

if (!globalThis.CYDON_NO_EXTRA)
	directives.push(...extra)