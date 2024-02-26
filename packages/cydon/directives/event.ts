import { Directive, DirectiveHandler } from '../type'
import { toFunction } from '../util'

/** elements that have event listener bound */
export const boundElements = new Map<string, WeakSet<Node>>()
/** context of event handler */
export const context = Symbol()
/** event handlers by event type */
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

export default <DirectiveHandler>((name, value, _el, _, parent): D => {
	// bind event
	if (name[0] == '@') {
		name = name.substring(1)
		const [type, ...m] = name.split('.'),
			modifiers = new Set(m),
			capture = modifiers.has('capture'),
			once = modifiers.has('once'),
			options = {
				capture,
				once,
				passive: modifiers.has('passive')
			},
			away = modifiers.has('away')
		let key: symbol | undefined
		if (!capture && !once && parent && type[0] != '$') { // delegate to root node of parent
			key = handlers.get(type)
			if (!key)
				handlers.set(type, key = Symbol())
			let set = boundElements.get(name)
			if (!set)
				boundElements.set(name, set = new WeakSet)
			const root = parent.getRootNode()
			if (!set.has(root)) {
				root.addEventListener(type, listener, options)
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
					// handles dynamic event name
					el.addEventListener(type[0] == '$' ? this[type.substring(1)] : type,
						away ? e => {
							if (e.target != el && !el.contains(<Node>e.target))
								handler.call(this, e)
						} : handler.bind(this), options)
				}
			}
		}
	}
})