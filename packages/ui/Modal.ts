import { customElement } from 'cydon'

@customElement('c-modal')
export default class Modal extends HTMLElement {
	constructor() {
		super()
		this.addEventListener('click', e => {
			if (e.currentTarget == e.target)
				this.hide()
		})
		this.addEventListener('keydown', this.keydown)
	}

	show() {
		this.ariaHidden = null
		this.ariaModal = 'true'
		this.setAttribute('role', 'dialog')
		this.classList.add('show')
		setTimeout(() => {
			this.classList.add('in')
			this.focus()
		}, 150)
		//this.scrollBar.hide()
	}

	hide() {
		this.ariaHidden = 'true'
		this.ariaModal = null
		this.removeAttribute('role')
		this.classList.remove('in')
		setTimeout(() => this.classList.remove('show'), 150)
	}

	keydown(e: KeyboardEvent) {
		if (e.key == 'Escape') {
			e.preventDefault()
			this.hide()
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'c-modal': Modal
	}
}