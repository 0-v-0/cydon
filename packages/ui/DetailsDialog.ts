// From https://github.com/github/details-dialog-element/blob/main/src/index.ts

const CLOSE_ATTR = 'data-close-dialog'
const CLOSE_SELECTOR = `[${CLOSE_ATTR}]`

type Target = Disableable | Focusable
type Disableable = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
type Focusable = HTMLElement

function autofocus(el: DetailsDialog) {
	let autofocusElement = [...el.querySelectorAll<HTMLElement>('[autofocus]')].find(focusable)
	if (!autofocusElement) {
		autofocusElement = el
		el.tabIndex = -1
	}
	autofocusElement.focus()
}

function keydown(event: KeyboardEvent) {
	const details = event.currentTarget
	if (!(details instanceof Element)) return
	if (event.key == 'Escape' || event.key == 'Esc') {
		toggleDetails(details, false)
		event.stopPropagation()
	} else if (event.key == 'Tab') {
		restrictTabBehavior(event)
	}
}

function focusable(el: Target) {
	return el.tabIndex >= 0 && !(<Disableable>el).disabled && visible(el)
}

function visible(el: Target) {
	return !el.hidden &&
		(!(el as Disableable).type || (<Disableable>el).type != 'hidden') &&
		(el.offsetWidth > 0 || el.offsetHeight > 0)
}

function restrictTabBehavior(event: KeyboardEvent) {
	if (!(event.currentTarget instanceof Element)) return
	const dialog = event.currentTarget.querySelector('details-dialog')
	if (!dialog) return
	event.preventDefault()

	const elements: Target[] = [...dialog.querySelectorAll<HTMLElement>('*')].filter(focusable)
	if (!elements.length) return

	const movement = event.shiftKey ? -1 : 1
	const root = <Document | ShadowRoot>dialog.getRootNode()
	const currentFocus = dialog.contains(root.activeElement) ? root.activeElement : null
	let targetIndex = movement == 1 ? 0 : -1

	if (currentFocus instanceof HTMLElement) {
		const currentIndex = elements.indexOf(currentFocus)
		if (currentIndex != -1) {
			targetIndex = currentIndex + movement
		}
	}
	elements[targetIndex < 0 ? elements.length - 1 : targetIndex % elements.length].focus()
}

function allowClosingDialog(details: Element) {
	const dialog = details.querySelector('details-dialog')
	return !(dialog instanceof DetailsDialog) || dialog.dispatchEvent(
		new CustomEvent('details-dialog-close', {
			bubbles: true,
			cancelable: true
		})
	)
}

function onSummaryClick(event: Event) {
	if (!(event.currentTarget instanceof Element)) return
	const details = event.currentTarget.closest('details')
	if (!details || !details.hasAttribute('open')) return

	// Prevent summary click events if details-dialog-close was cancelled
	if (!allowClosingDialog(details)) {
		event.preventDefault()
		event.stopPropagation()
	}
}

function toggle(event: Event) {
	const details = event.currentTarget
	if (!(details instanceof Element)) return
	const dialog = details.querySelector('details-dialog')
	if (!(dialog instanceof DetailsDialog)) return

	if (details.hasAttribute('open')) {
		const root = <Document | ShadowRoot>dialog.getRootNode()
		if (root.activeElement instanceof HTMLElement) {
			initialized.set(dialog, { details, activeElement: root.activeElement })
		}

		autofocus(dialog)
			; (<HTMLElement>details).addEventListener('keydown', keydown)
	} else {
		for (const form of dialog.querySelectorAll('form')) {
			form.reset()
		}
		const focusElement = findFocusElement(details, dialog)
		if (focusElement) focusElement.focus()
			; (<HTMLElement>details).removeEventListener('keydown', keydown)
	}
}

function findFocusElement(details: Element, dialog: DetailsDialog): HTMLElement | null {
	const state = initialized.get(dialog)
	if (state && state.activeElement instanceof HTMLElement) {
		return state.activeElement
	} else {
		return details.querySelector('summary')
	}
}

function toggleDetails(details: Element, open: boolean) {
	// Don't update unless state is changing
	if (open != details.hasAttribute('open')) {
		if (open) {
			details.setAttribute('open', '')
		} else if (allowClosingDialog(details)) {
			details.removeAttribute('open')
		}
	}
}

function loadIncludeFragment(event: Event) {
	const details = event.currentTarget
	if (!(details instanceof Element)) return
	const dialog = details.querySelector('details-dialog')
	if (!(dialog instanceof DetailsDialog)) return
	const loader = dialog.querySelector('include-fragment:not([src])')
	if (!loader) return

	const { src } = dialog
	if (src != null) {
		loader.addEventListener('loadend', () => {
			if (details.hasAttribute('open')) autofocus(dialog)
		})
		loader.setAttribute('src', src)
		removeIncludeFragmentEventListeners(details)
	}
}

function updateIncludeFragmentEventListeners(details: Element, src: string | null, preload: boolean) {
	removeIncludeFragmentEventListeners(details)

	if (src) {
		details.addEventListener('toggle', loadIncludeFragment, { once: true })
		if (preload) {
			details.addEventListener('mouseover', loadIncludeFragment, { once: true })
		}
	}
}

function removeIncludeFragmentEventListeners(details: Element) {
	details.removeEventListener('toggle', loadIncludeFragment)
	details.removeEventListener('mouseover', loadIncludeFragment)
}

type State = {
	details: Element | null
	activeElement: HTMLElement | null
}

const initialized = new WeakMap<Element, State>()

export default class DetailsDialog extends HTMLElement {
	static CLOSE_ATTR = CLOSE_ATTR
	static CLOSE_SELECTOR = CLOSE_SELECTOR

	constructor() {
		super()
		initialized.set(this, { details: null, activeElement: null })
		this.addEventListener('click', ({ target }) => {
			if (!(target instanceof Element))
				return
			const details = target.closest('details')
			if (details && target.closest(CLOSE_SELECTOR)) {
				toggleDetails(details, false)
			}
		})
		this.addEventListener('submit', event => {
			const { target, submitter } = event
			if (!(target instanceof HTMLFormElement))
				return

			const method = submitter?.getAttribute('formmethod') || target.getAttribute('method')

			if (method == 'dialog') {
				event.preventDefault()
				const details = target.closest('details')
				if (details) {
					toggleDetails(details, false)
				}
			}
		})
	}

	get src() {
		return this.getAttribute('src')
	}

	set src(value) {
		this.setAttribute('src', value || '')
	}

	get preload() {
		return this.hasAttribute('preload')
	}

	set preload(value) {
		value ? this.setAttribute('preload', '') : this.removeAttribute('preload')
	}

	connectedCallback() {
		this.setAttribute('role', 'dialog')
		this.setAttribute('aria-modal', 'true')
		const state = initialized.get(this)
		if (!state) return
		const details = this.parentElement
		if (!details) return

		const summary = details.querySelector('summary')
		if (summary) {
			if (!summary.hasAttribute('role')) summary.setAttribute('role', 'button')
			summary.addEventListener('click', onSummaryClick, { capture: true })
		}

		details.addEventListener('toggle', toggle)
		state.details = details

		updateIncludeFragmentEventListeners(details, this.src, this.preload)
	}

	disconnectedCallback() {
		const state = initialized.get(this)
		if (!state) return
		const { details } = state
		if (details) {
			details.removeEventListener('toggle', toggle)
			removeIncludeFragmentEventListeners(details)
			details.querySelector('summary')?.removeEventListener('click', onSummaryClick, { capture: true })
			state.details = null
		}
	}

	toggle(open: boolean) {
		const state = initialized.get(this)
		if (!state) return
		const { details } = state
		if (details)
			toggleDetails(details, open)
	}

	static get observedAttributes() {
		return ['src', 'preload']
	}

	attributeChangedCallback() {
		const state = initialized.get(this)
		if (!state) return
		const { details } = state
		if (details)

			updateIncludeFragmentEventListeners(details, this.src, this.preload)
	}
}
customElements.define('details-dialog', DetailsDialog)
