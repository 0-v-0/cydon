/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

import { for_ } from './directives'
import { Constructor as Ctor } from './util'

const funcCache: Record<string, Function> = Object.create(null)

export const getFunc = (code: string) => <(this: Data, el: Element) => any>
	funcCache[code] || (funcCache[code] = Function('$e', `with(this){${code}}`))

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
			`\`;if($v!=$e.getAttribute('${attr}'))$e.setAttribute('${attr}',$v)` :
			'return`' + vals + '`')
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
	data: Data
	func: Func | ((this: Data, el: Element) => void)
}

type DF = DocumentFragment

/** template result */
export type Result = Partial<Part> & {
	attrs?: Map<string, AttrPart>
	sr?: DF
	res?: Results
	exp?: [string, string]
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

		compile(results: Results, el: Element | DF, level = 0, i = 0): void {
			let result: Result | undefined
			let map = new Map<string, AttrPart>()
			const attrs = (<Element>el).attributes
			// Find pattern in attributes
			if (attrs) {
				if (!el.isConnected && (<Element>el).tagName.includes('-'))
					return
				const exp = attrs[<any>'c-for']
				if (exp) {
					const val = exp.value
					if (val) {
						const res: Results = []
						this.compile(res, (<HTMLTemplateElement>el).content)
						let [key, value] = val.split(';')
						if (import.meta.env.DEV && !value)
							console.warn('invalid v-for expression: ' + val)
						results.push(level << 22 | i, { res, exp: [key, value.trim()] })
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
					results.push(level << 22 | i, result = { attrs: map })
			}
			const sr = (<Element>el).shadowRoot
			if (sr) {
				const res: Results = []
				this.compile(res, sr)
				results.push(level << 22 | i, result = { sr, res })
			}
			let node: Node | null = el.firstChild
			if (node && !result)
				results.push(level << 22 | i)
			level++
			for (let i = 0; node; node = node.nextSibling) {
				if (node.nodeType == 1)
					this.compile(results, <Element>node, level, i)
				if (node.nodeType == 3) { // text node
					const parts = <Result>parse((<Text>node).data)
					if (parts)
						results.push(level << 22 | i, parts)
				}
				i++
			}
		}

		bind(results: Results, el: Element | DF = <any>this): void {
			let node: Node = el
			let l = 0, n = 0, stack = []
			for (let i = 0; i < results.length; ++i) {
				const result = results[i]
				if (typeof result == 'object') {
					let { attrs, res, sr } = result
					if (sr) {
						let shadow = (<Element>node).shadowRoot
						if (!shadow) {
							shadow = (<Element>node).attachShadow({ mode: 'open' })
							sr.childNodes.forEach(c => shadow!.append(c.cloneNode(true)))
						}
						this.bind(res!, shadow)
					} else if (res) {
						const p = node.parentNode!
						for_(this, <HTMLTemplateElement>node, res, result.exp!)
						node = p
						n = stack.pop()!
						l--
					} else if (result.func)
						this.add(<Text>node, <Part>result)
					else if (attrs) {
						for (const part of attrs.values())
							this.add(<Element>node, part)
					}
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

		add(node: Target['node'], part: Part) {
			const target: Target = Object.create(part)
			const deps = part.deps
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
			} else
				target.data = this.data
			this.targets.add(target)
			this.queue.add(target)
		}

		/**
		 * unmount an element
		 * @param el target element
		 */
		unmount(el: Element | DF = <any>this) {
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
		update({ node, data, func }: Target) {
			if (node.nodeType == 3)
				(<Text>node).data = (<Func>func).call(data, <Element>node.parentNode)
			else
				(<Func>func).call(data, <Element>node)
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
				if (this.queue.has(target)) {
					this.update(target)
					if (!target.deps)
						this.targets.delete(target)
				} else
					for (const prop of this.queue) {
						if (typeof prop == 'string' && target.deps?.has(prop)) {
							this.update(target)
							break
						}
					}
			}
			this.queue.clear()
		}

		connectedCallback() {
			if (this instanceof Element && !this.hasAttribute('c-for'))
				this.mount()
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
