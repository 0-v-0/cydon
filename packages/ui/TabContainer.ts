// From https://github.com/github/tab-container-element/blob/main/src/index.ts

type IncrementKeyCode = 'ArrowRight' | 'ArrowDown'
type DecrementKeyCode = 'ArrowUp' | 'ArrowLeft'

const getTabs =
	(el: TabContainer) => [...el.querySelectorAll<HTMLElement>('[role=tablist] [role=tab]')].filter(
		tab => tab.closest(el.tagName) == el
	)

function getNavigationKeyCodes(vertical: boolean): [IncrementKeyCode[], DecrementKeyCode[]] {
	return vertical ? [
		['ArrowDown', 'ArrowRight'],
		['ArrowUp', 'ArrowLeft']
	] : [['ArrowRight'], ['ArrowLeft']]
}

export default class TabContainer extends HTMLElement {
	get storageKey() {
		return this.getAttribute('storage-key')
	}
	set storageKey(value) {
		if (value)
			this.setAttribute('storage-key', value)
		else
			this.removeAttribute('storage-key')
	}

	constructor() {
		super()

		this.addEventListener('keydown', event => {
			const target = event.target
			if (!(target instanceof HTMLElement)) return
			if (target.closest(this.tagName) != this) return
			if (target.getAttribute('role') != 'tab' && !target.closest('[role=tablist]')) return
			const tabs = getTabs(this)
			const currentIndex = tabs.indexOf(tabs.find(tab => tab.ariaSelected == 'true')!)
			const [incrementKeys, decrementKeys] = getNavigationKeyCodes(
				target.closest('[role=tablist]')?.ariaOrientation == 'vertical'
			)

			let index
			if (incrementKeys.some(code => event.code == code)) {
				index = currentIndex + 1
				if (index >= tabs.length) index = 0
				this.select(index)
			} else if (decrementKeys.some(code => event.code == code)) {
				index = currentIndex - 1
				if (index < 0) index = tabs.length - 1
				this.select(index)
			} else if (event.code == 'Home') {
				this.select(0)
				event.preventDefault()
			} else if (event.code == 'End') {
				this.select(tabs.length - 1)
				event.preventDefault()
			}
		})

		this.addEventListener('click', event => {
			const tabs = getTabs(this)

			if (event.target instanceof Element) {
				if (event.target.closest(this.tagName) == this) {
					const tab = event.target.closest('[role=tab]')
					if (!(tab instanceof HTMLElement) || !tab.closest('[role=tablist]')) return

					this.select(tabs.indexOf(tab))
				}
			}
		})
	}

	connectedCallback() {
		for (const tab of getTabs(this)) {
			if (!tab.ariaSelected)
				tab.ariaSelected = 'false'
			if (tab.tabIndex == -1)
				tab.tabIndex = tab.ariaSelected == 'true' ? 0 : -1
		}
		const key = +this.storageKey!
		if (key >= 0)
			this.select(key)
	}

	select(index: number) {
		const tabs = getTabs(this)
		const panels = [...this.querySelectorAll<HTMLElement>('[role=tabpanel]')].filter(
			panel => panel.closest(this.tagName) == this
		)

		const selectedTab = tabs[index]
		const selectedPanel = panels[index]

		const cancelled = !this.dispatchEvent(
			new CustomEvent('tab-container-change', {
				bubbles: true,
				cancelable: true,
				detail: { relatedTarget: selectedPanel }
			})
		)
		if (cancelled) return

		for (const tab of tabs) {
			if (tab != selectedTab) {
				tab.ariaSelected = 'false'
				tab.setAttribute('tabindex', '-1')
			}
		}
		for (const panel of panels) {
			panel.hidden = true
			if (!panel.hasAttribute('tabindex') && !panel.hasAttribute('data-tab-container-no-tabstop'))
				panel.setAttribute('tabindex', '0')
		}

		selectedTab.ariaSelected = 'true'
		selectedTab.setAttribute('tabindex', '0')
		selectedTab.focus()
		selectedPanel.hidden = false

		this.dispatchEvent(new CustomEvent('tab-container-changed', {
			bubbles: true,
			detail: { relatedTarget: selectedPanel }
		}))
		const key = this.storageKey
		if (key)
			sessionStorage.setItem(key, index + '')
	}
}
customElements.define('tab-container', TabContainer)

declare global {
	interface HTMLElementTagNameMap {
		'tab-container': TabContainer
	}
}