import { bind, CydonOption, directives, ReactiveElement, TargetValue } from 'cydon'
import { isDisabled } from './util'

export * from './util'

export const toggle = (e: HTMLElement) => {
	if ((<any>e).show && (<any>e).hide)
		e.ariaHidden ? (<any>e).show() : (<any>e).hide()
	else
		e.hidden = !e.hidden
}

export class ListElement<T = any> extends HTMLElement {
	$items: T[] = []
	private _items: T[] | undefined
	template: HTMLElement
	root: HTMLElement = this

	constructor(selector = '[slot=item]') {
		super()
		const tpl = query(this, selector)
		if (!tpl)
			throw new Error('Item template element not found')
		this.template = <HTMLElement>cloneWithShadowRoots(tpl)
		tpl.remove() // TODO why?
	}

	get length() { return this.$items.length }
	set length(n) {
		this.$items.length = n
		if (n > this.capacity)
			this.capacity = n
		for (let d = this.capacity; d-- > n;)
			this.render(<HTMLElement>this.root.children[d], this.$items[d])
	}

	get capacity() { return this.root.children.length }
	set capacity(n) {
		let d = this.capacity
		for (; d < n; d++)
			this.root.append(this.createItem())
		for (; d-- > n;)
			this.root.children[d].remove()
	}

	get items() {
		return this._items || (this._items = new Proxy(this.$items, {
			set: (obj, prop, value: T) => {
				if (prop == 'length')
					this.length = +value
				else {
					obj[<any>prop] = value;
					if (typeof prop == 'string' && <any>prop == parseInt(prop)) {
						const old = <HTMLElement>this.root.children[<any>prop],
							node = old || this.createItem();
						this.render(node, value)
						if (old) {
							if (old != node)
								old.replaceWith(node)
						} else
							this.root.append(node)
					}
				}
				return true
			}
		}))
	}
	set items(items) {
		Object.assign(this.items, items).length = items.length
	}

	/**
	 * render target element with the item
	 *
	 * @param el target element
	 * @param item item to render
	 */
	render(el: HTMLElement, item?: T) {
		el.slot = item == void 0 ? 'hidden' : 'list'
	}

	createItem() {
		return <HTMLElement>cloneWithShadowRoots(this.template)
	}
}

export class TableElement<T = any> extends ListElement<T> {
	static observedAttributes = ['per-page']
	private _list: T[] = []
	private _perPage = 10
	private _pageNum = 0

	data

	get perPage() {
		return this._perPage
	}
	set perPage(value) {
		this._perPage = value || 10
		this.list = this._list
	}

	get pageNum() {
		return this._pageNum
	}
	set pageNum(value) {
		this._pageNum = value
		this.list = this._list
	}

	get list() {
		return this._list
	}
	set list(data) {
		this._list = data
		const i = this.pageNum, n = this.perPage
		super.items = data.slice(i * n, i * n + n)
	}

	constructor(selector = '[slot=row]', options?: CydonOption) {
		super(selector)
		const tbody = query(this, 'tbody')
		if (!tbody)
			throw new Error('Missing table element')
		this.root = tbody
		this.data = bind(this, options).data
	}

	attributeChangedCallback() {
		this.data.perPage = +this.getAttribute('per-page')! || 10
	}

	override render(el: ReactiveElement, item?: T) {
		el.hidden = item == void 0
		if (item)
			Object.assign(el.data, item)
	}
}

// query an element in its shadow root (if exists) or its descendants
const query = (el: Element, selector: string) =>
	el.shadowRoot?.querySelector<HTMLElement>(selector) ||
	el.querySelector<HTMLElement>(selector)

// From https://gist.github.com/zalelion/df185578a456eb855e43f959af71059d
function walk(node: Element, clone: Element) {
	const nodes = node.shadowRoot;
	if (nodes) {
		const shadow = clone.attachShadow({ mode: 'open' })
		nodes.childNodes.forEach(c => shadow.append(c.nodeType == 1/*Node.ELEMENT_NODE*/ ?
			cloneWithShadowRoots(<Element>c) : c.cloneNode(true)));
	}
	for (let i = 0; i < node.children.length; i++)
		walk(node.children[i], clone.children[i])
}

/**
 * cloneNode(true), but also clones shadow roots.
 * @param node
 */
function cloneWithShadowRoots(node: Element) {
	const clone = node.cloneNode(true)
	walk(node, <Element>clone)
	return clone
}

directives.unshift(function ({ name, value, ownerElement: el }) {
	if (name == '@click.outside') {
		const func = this.getFunc(value)
		el.addEventListener('click', e => {
			if (e.target != el && !el.contains(<Node>e.target))
				func(e)
		})
		return true
	}
	return
})

directives.push(function ({ name, value, ownerElement: el }) {
	if (name == 'ref') {
		if (import.meta.env.DEV && value in this.$data)
			console.warn(`The ref "${value}" has already defined on`, this.$data)
		this.$data[value] = el
		return true
	}
	return
})

directives.push(function ({ name, value, ownerElement: el }) {
	if (name == 'c-target') {
		el.addEventListener('click', e => {
			const el = <HTMLElement>e.currentTarget
			if (el.tagName == 'A' || el.tagName == 'AREA')
				e.preventDefault()
			if (!isDisabled(el)) {
				e.stopPropagation()
				if (this.$data[value])
					toggle(this.$data[value])
				else
					document.body.querySelectorAll<HTMLElement>(value).forEach(toggle)
			}
		})
		return true
	}
	return
})

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
directives.push(function ({ name, value, ownerElement: el }) {
	if (name[0] == ':') {
		name = name.substring(1)
		if (!el.hasAttribute(name))
			el.setAttribute(name, '')
		const node = el.attributes[<any>name]
		let data = this.targets.get(node)
		let val
		if (!data) {
			val = node.value
			this.add(data = { node, deps: new Set(), vals: [val] })
		}
		for (const cls of value.split(';')) {
			const p = cls.indexOf(':')
			if (~p) {
				const part = <TargetValue>['',
					Function(`with(this){return ${cls.substring(p + 1)}?'${cls.substring(0, p)}':''}`)]
				this.addPart(part, data.deps)
				if (val)
					data.vals.push(' ');
				(<TargetValue[]>data.vals).push(part)
				val = 1
			}
		}
		return true
	}
	return
})
