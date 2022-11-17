import { define } from 'cydon'
import Modal from './Modal'

@define('c-dropdown')
export default class Dropdown extends Modal {
	get open() {
		return this.ariaExpanded == 'true'
	}
	set open(val) {
		this.ariaExpanded = val + ''
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'c-dropdown': Dropdown
	}
}
