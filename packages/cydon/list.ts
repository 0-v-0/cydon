import { CydonElement, Data, cloneWithShadowRoots, ReactiveElement, query } from '.'

type Ctor = Function & {
	itemKeys?: string[]
}

export class ListElement<T extends {}> extends CydonElement {
	/**
	 * raw array of items
	 */
	$items: T[] = []

	private _items?: T[]

	/**
	 * item template
	 */
	template?: HTMLElement

	/**
	 * root container
	 */
	root: HTMLElement = this

	constructor(selector = '[slot=item]', data?: Data) {
		super(data)
		const tpl = query(this, selector)
		if (tpl) {
			this.template = <HTMLElement>cloneWithShadowRoots(tpl)
			tpl.remove()
		}
	}

	/**
	 * length of items array
	 */
	get length() { return this.$items.length }
	set length(n) {
		this.$items.length = n
		if (n > this.capacity)
			this.capacity = n
		for (let d = this.capacity; d-- > n;)
			this.render(<ReactiveElement>this.root.children[d], void 0)
	}

	/**
	 * the number of child elements
	 */
	get capacity() { return this.root.children.length }
	set capacity(n) {
		let d = this.capacity
		for (; d < n; d++)
			this.root.append(this.render())
		for (; d-- > n;)
			this.root.children[d].remove()
	}

	/**
	 * reactive array of items
	 */
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
		if (!el) {
			const tpl = this.template
			if (!tpl)
				throw new Error('Item template element not found')
			el = <ReactiveElement>cloneWithShadowRoots(tpl)
		}

		// if item is undefined, hide the element
		el.data.hidden = item == void 0

		// update data
		if (item) {
			const keys = (<Ctor>this.constructor).itemKeys
			if (keys)
				for (const key of keys)
					el.data[key] = (<Data>item)[key]
		}
		this.updateValue('items')
		return <ReactiveElement & T>el
	}
}