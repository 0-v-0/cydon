import { lazyBind, directives, ReactiveElement } from 'cydon'
import { isDisabled, toggle } from './util'

export * from './util'

export class ListElement<T extends {}> extends HTMLElement {
	$items: T[] = []
	private _items?: T[]
	template: HTMLElement
	root: HTMLElement = this
	cydon = lazyBind(this)
	get data() {
		return this.cydon.data
	}

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
			this.render(<ReactiveElement>this.root.children[d], void 0)
	}

	get capacity() { return this.root.children.length }
	set capacity(n) {
		let d = this.capacity
		for (; d < n; d++)
			this.root.append(this.render())
		for (; d-- > n;)
			this.root.children[d].remove()
	}

	get items() {
		return this._items || (this._items = new Proxy(this.$items, {
			get: (obj, prop: any) => {
				const val = obj[prop]
				return (val && (<ReactiveElement>this.root.children[prop])?.data) ?? val
			},
			set: (obj: any, prop, value: T) => {
				if (prop == 'length')
					this.length = +value
				else {
					if (typeof prop == 'string' && <any>prop == parseInt(prop)) {
						const old = <ReactiveElement>this.root.children[<any>prop],
							node = this.render(old, value)
						if (old) {
							if (old != node)
								old.replaceWith(node)
						} else
							this.root.append(node)
						obj[prop] = node
					} else
						obj[prop] = value
				}
				return true
			}
		}))
	}
	set items(items: T[]) {
		if (items != this.items)
			Object.assign(this.items, items).length = items.length
	}

	/**
	 * render target element with the item
	 *
	 * @param el target element, return a new element if it is undefined
	 * @param item item to render
	 * @returns element
	 */
	render(el?: ReactiveElement, item?: T) {
		// create a new element
		if (!el)
			el = <ReactiveElement>cloneWithShadowRoots(this.template)

		// if item is undefined, hide the element
		el.data.hidden = item == void 0

		// update data
		if (item)
			Object.assign(el.data, item)
		this.cydon.updateValue('items')
		return el
	}
}

export class TableElement<T extends {}> extends ListElement<T> {
	static observedAttributes = ['per-page']
	private _list: T[] = []
	private _perPage = 10
	private _pageNum = 0

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

	constructor(selector = '[slot=row]') {
		super(selector)
		const tbody = query(this, 'tbody')
		if (!tbody)
			throw new Error('Missing table element')
		this.root = tbody
	}

	attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
		if (name == 'per-page')
			this.data.perPage = +newVal || 10
	}
}

// query an element in its shadow root (if exists) or its descendants
const query = (el: Element, selector: string) =>
	el.shadowRoot?.querySelector<HTMLElement>(selector) ||
	el.querySelector<HTMLElement>(selector)

// From https://gist.github.com/zalelion/df185578a456eb855e43f959af71059d
function walk(node: Element, clone: Element) {
	const nodes = node.shadowRoot
	if (nodes) {
		const shadow = clone.attachShadow({ mode: 'open' })
		nodes.childNodes.forEach(c => shadow.append(c.nodeType == 1/*Node.ELEMENT_NODE*/ ?
			cloneWithShadowRoots(<Element>c) : c.cloneNode(true)))
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

directives.push(function ({ name, value, ownerElement: el }): true | void {
	if (name == 'c-toggle') {
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
})