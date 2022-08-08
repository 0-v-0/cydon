import { customElement } from "cydon"

// From https://github.com/github/clipboard-copy-element
export const copyNode = (node: Element) => navigator.clipboard.writeText(node.textContent || '')
export const copyText = (text: string) => navigator.clipboard.writeText(text)

async function copy(button: HTMLElement) {
	const id = button.getAttribute('for')
	const text = button.getAttribute('value')

	function trigger() {
		button.dispatchEvent(new CustomEvent('clipboard-copy', { bubbles: true }))
	}

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

function copyTarget(content: Element) {
	if (content instanceof HTMLInputElement || content instanceof HTMLTextAreaElement)
		return copyText(content.value)
	if (content instanceof HTMLAnchorElement && content.hasAttribute('href'))
		return copyText(content.href)
	return copyNode(content)
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

@customElement('clipboard-copy')
export class ClipboardCopy extends HTMLElement {
	constructor() {
		super()
		this.addEventListener('click', event => {
			const button = event.currentTarget
			if (button instanceof HTMLElement)
				copy(button)
		})
		this.addEventListener('focus', event =>
			(<HTMLElement>event.currentTarget).addEventListener('keydown', keydown))
		this.addEventListener('blur', event =>
			(<HTMLElement>event.currentTarget).removeEventListener('keydown', keydown))
	}

	connectedCallback(): void {
		if (!this.hasAttribute('tabindex'))
			this.setAttribute('tabindex', '0')

		if (!this.hasAttribute('role'))
			this.setAttribute('role', 'button')
	}

	get value(): string {
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
