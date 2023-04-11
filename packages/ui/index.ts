import { CydonElement, Directive, directives } from 'cydon'
import { isDisabled, toggle } from './util'

export * from './util'

export class TableElement<T extends {}> extends CydonElement {
	static observedAttributes = ['per-page']
	items: T[] = []
	private _list: T[] = []
	private _perPage = 10
	private _pageNum = 0

	get perPage() {
		return this._perPage
	}
	set perPage(value) {
		this._perPage = +value || 10
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
		this.items = data.slice(i * n, i * n + n)
	}

	attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
		if (name == 'per-page')
			this.data.perPage = +newVal || 10
	}
}

if (!globalThis.CYDON_NO_TOGGLE)
	directives.push(({ name, value }): Directive | void => {
		if (name == 'c-toggle') {
			return {
				f(el) {
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
				}
			}
		}
	})

declare module globalThis {
	const CYDON_NO_TOGGLE: boolean | undefined
}