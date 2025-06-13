import { define } from 'cydon'

// From https://github.com/github/clipboard-copy-element
export const copy = (text: string) => navigator.clipboard.writeText(text)

function handle(el: Element) {
	const text = el.getAttribute('value'),
		trigger = async (node: Node | string) => {
			await copyTarget(node)
			el.dispatchEvent(new CustomEvent('clipboard-copy', { bubbles: true }))
		}

	if (text) {
		trigger(text)
	} else {
		const id = el.getAttribute('for')
		if (id) {
			const root = el.getRootNode() as Document | ShadowRoot
			const node = root.getElementById(id) || root.querySelector(id)
			if (node) {
				trigger(node)
			}
		}
	}
}

function copyTarget(node: Node | string) {
	if (typeof (node as any).value == 'string')
		return copy((node as any).value)
	if (node instanceof HTMLAnchorElement && node.href)
		return copy(node.href)
	if (node instanceof Node)
		return copy(node.textContent || '')
	return copy(node)
}

function keydown(e: KeyboardEvent) {
	if (e.key == ' ' || e.key == 'Enter') {
		const button = e.currentTarget
		if (button instanceof Element) {
			e.preventDefault()
			handle(button)
		}
	}
}

@define('clipboard-copy')
export class ClipboardCopy extends HTMLElement {
	constructor() {
		super()
		this.addEventListener('click', e => {
			const button = e.currentTarget
			if (button instanceof Element)
				handle(button)
		})
		this.addEventListener('focus', e =>
			(e.currentTarget as HTMLElement).addEventListener('keydown', keydown))
		this.addEventListener('blur', e =>
			(e.currentTarget as HTMLElement).removeEventListener('keydown', keydown))
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
