import { Data, directives, ListElement, query } from 'cydon'
import { isDisabled, toggle } from './util'

export * from './util'

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

	constructor(selector = '[slot=row]', data?: Data) {
		super(selector, data)
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

if (!globalThis.CYDON_NO_TOGGLE)
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

declare module globalThis {
	const CYDON_NO_TOGGLE: boolean
}