import { define } from 'cydon'
import CModal from './CModal'

@define('c-dropdown')
export default class CDropdown extends CModal {
	get open() {
		return this.ariaExpanded == 'true'
	}
	set open(val) {
		this.ariaExpanded = val + ''
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'c-dropdown': CDropdown
	}
}
