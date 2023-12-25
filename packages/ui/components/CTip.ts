// From https://github.com/XboxYan/xy-ui/blob/master/components/xy-tips.js
import html from './c-tip.html?raw'

export class CTip extends HTMLElement {
	static observedAttributes = ['color']

	constructor() {
		super()
		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = html
	}

	get color() { return this.getAttribute('color') ?? '' }

	get dir() { return this.getAttribute('dir') || 'top' }

	get tips() { return this.getAttribute('tips')! }

	get type() { return this.getAttribute('tips')! }

	get suffix() { return this.getAttribute('suffix') ?? '' }

	get show() { return this.hasAttribute('show') }

	set color(value) { this.setAttribute('color', value) }

	set dir(value) { this.setAttribute('dir', value) }

	set tips(value) { this.setAttribute('tips', value) }

	set suffix(value) { this.setAttribute('suffix', value) }

	set show(value) { this.toggleAttribute('show', value) }

	set type(value) { this.setAttribute('type', value) }

	connectedCallback() {
		if (this.dir == 'auto') {
			const { left, top, width, height } = this.getBoundingClientRect()
			const w = document.body.scrollWidth
			const h = document.body.scrollHeight
			const TIP_SIZE = 50
			if (top < TIP_SIZE)
				this.dir = 'bottom'
			if (h - top - height < TIP_SIZE)
				this.dir = 'top'
			if (left < TIP_SIZE)
				this.dir = 'right'
			if (w - left - width < TIP_SIZE)
				this.dir = 'left'
		}
	}

	attributeChangedCallback(name: string, _old: any, newVal: string | null) {
		if (name == 'color' && this.shadowRoot)
			this.style.setProperty('--color', newVal)
	}
}

customElements.define('c-tip', CTip)

declare global {
	interface HTMLElementTagNameMap {
		'c-tip': CTip
	}
}