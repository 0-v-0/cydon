import { customElement } from 'cydon'
import Modal from './Modal'

@customElement('c-dropdown')
export default class Dropdown extends Modal {
	items!: NodeListOf<Element>
	connectedCallback() {
		this.updateItems()
	}

	get open() {
		return this.ariaExpanded == 'true'
	}
	set open(val) {
		this.ariaExpanded = val + ''
	}

	updateItems() {
		this.items = this.querySelectorAll('*:not(.disabled):visible a')
	}

	keydown(e: KeyboardEvent) {
		if (/38|40|27|32/.test(e.which + '') && !/INPUT|TEXTAREA/.test((<HTMLInputElement>e.target).tagName)) {
			super.keydown(e)
			e.preventDefault()
			e.stopPropagation()
			let index = this.items.length
			while (index--) {
				if (this.items[index] == e.target)
					break
			}
			if (e.which == 38)
				index--; // up
			if (e.which == 40)
				index++; // down
			(<HTMLAnchorElement>this.items[index])?.focus?.()
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'c-dropdown': Dropdown
	}
}
