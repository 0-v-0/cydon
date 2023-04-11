import { Directive, DirectiveHandler } from '../type'
import { toFunction } from '../util'

export const boundElements = new Map<string, WeakSet<Node>>()
export const context = Symbol()
const handlers = new Map<string, symbol>()

type D = Directive | void

declare global {
	interface Node {
		[x: symbol]: any
	}
}

const listener = (e: Event) => {
	const key = handlers.get(e.type)
	if (key)
		for (let target = e.target; target instanceof Node; target = target.parentNode) {
			const handler: Function = target[key]
			if (handler) {
				handler.call(target[context], e)
				break
			}
		}
}

export default <DirectiveHandler>(({ name, value }, _, parent): D => {
	// bind event
	if (name[0] == '@') {
		const arr = name.substring(1).split('.'),
			modifiers = new Set(arr.slice(1)),
			options = {
				capture: modifiers.has('capture'),
				once: modifiers.has('once'),
				passive: modifiers.has('passive')
			},
			away = modifiers.has('away')
		name = arr[0]
		let key: symbol | undefined
		if (parent && name[0] != '$') { // delegate to root node of parent
			key = handlers.get(name)
			if (!key)
				handlers.set(name, key = Symbol())
			let set = boundElements.get(name)
			if (!set)
				boundElements.set(name, set = new WeakSet)
			const root = parent.getRootNode()
			if (!set.has(root)) {
				root.addEventListener(name, listener, options)
				set.add(root)
			}
		}
		return {
			f(el) {
				const handler: Function = this[value] ?? toFunction(value)
				if (key) {
					el[key] = handler
					el[context] = this
				} else {
					if (name[0] == '$')
						name = this[name.substring(1)] // dynamic event name
					el.addEventListener(name, away ? e => {
						if (e.target != el && !el.contains(<Node>e.target))
							handler.call(this, e)
					} : handler.bind(this), options)
				}
			}
		}
	}
})