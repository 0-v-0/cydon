import { define } from 'cydon'

// From https://github.com/github/clipboard-copy-element
export const copyNode = (node: Element) => navigator.clipboard.writeText(node.textContent || '')
export const copyText = (text: string) => navigator.clipboard.writeText(text)

async function copy(button: Element) {
	const id = button.getAttribute('for')
	const text = button.getAttribute('value'),
		trigger = () =>
			button.dispatchEvent(new CustomEvent('clipboard-copy', { bubbles: true }))

	if (text) {
		await copyText(text)
		trigger()
	} else if (id) {
		const root = button.getRootNode()
		if (root instanceof Document || root instanceof ShadowRoot) {
			const node = root.getElementById(id)
			if (node) {
				await copyTarget(node)
				trigger()
			}
		}
	}
}

function copyTarget(el: Element) {
	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
		return copyText(el.value)
	if (el instanceof HTMLAnchorElement && el.href)
		return copyText(el.href)
	return copyNode(el)
}

function keydown(event: KeyboardEvent) {
	if (event.key == ' ' || event.key == 'Enter') {
		const button = event.currentTarget
		if (button instanceof HTMLElement) {
			event.preventDefault()
			copy(button)
		}
	}
}

@define('clipboard-copy')
export class ClipboardCopy extends HTMLElement {
	constructor() {
		super()
		this.addEventListener('click', event => {
			const button = event.currentTarget
			if (button instanceof Element)
				copy(button)
		})
		this.addEventListener('focus', event =>
			(<HTMLElement>event.currentTarget).addEventListener('keydown', keydown))
		this.addEventListener('blur', event =>
			(<HTMLElement>event.currentTarget).removeEventListener('keydown', keydown))
	}

	connectedCallback() {
		if (this.tabIndex < 0)
			this.tabIndex = 0

		if (!this.hasAttribute('role'))
			this.setAttribute('role', 'button')
	}

	get value() {
		return this.getAttribute('value') || ''
	}

	set value(text: string) {
		this.setAttribute('value', text)
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'clipboard-copy': ClipboardCopy
	}
}
