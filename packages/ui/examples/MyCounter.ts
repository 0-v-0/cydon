import { customElement, CydonElement } from 'cydon';

@customElement('my-counter')
export class MyCounter extends CydonElement {
	value = +this.getAttribute('value')!

	constructor() {
		super()
		this.bind()
	}

	inc() { this.value++ }
	dec() { this.value-- }
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
	}
}