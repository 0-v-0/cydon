import { directives, Directive } from 'cydon'

export const isDisabled = (el: Element) => !el || el.nodeType != 1 || (<any>el).disabled

	/**
	* Trick to restart an element's animation
	*
	* @see https://www.charistheo.io/blog/2021/02/restart-a-css-animation-with-javascript/#restarting-a-css-animation
	*/
	,
	reflow = (element: HTMLElement) => element.offsetHeight,

	onDOMContentLoaded = (callback: (ev?: Event) => any) => {
		if (document.readyState == 'loading')
			document.addEventListener('DOMContentLoaded', callback)
		else
			callback()
	},

	isRTL = (e: HTMLElement) => (e || document.documentElement).dir == 'rtl'

export const isTargetElement = (element: Node, name: string) =>
	element.nodeType == 1 /* Node.ELEMENT_NODE */ && (<Element>element).localName == name

export const getSlotElementNodes = (slot: HTMLSlotElement) =>
	slot.assignedNodes().filter(el => el.nodeType == 1 /* Node.ELEMENT_NODE */)

export const querySlot = (el: Element, name: string) =>
	el.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)

export const toggle = (e: HTMLElement) => {
	if ((<any>e).show && (<any>e).hide)
		e.ariaHidden ? (<any>e).show() : (<any>e).hide()
	else
		e.hidden = !e.hidden
}

if (!globalThis.CYDON_NO_TOGGLE)
	directives.push(({ name, value }): Directive | void => {
		if (name == 'c-toggle') {
			return {
				f(el) {
					el.addEventListener('click', e => {
						const el = <HTMLElement>e.currentTarget
						if (el.tagName == 'A' || el.tagName == 'AREA')
							e.preventDefault()
						if (!isDisabled(el)) {
							e.stopPropagation()
							if (this.$data[value])
								toggle(this.$data[value])
							else
								document.body.querySelectorAll<HTMLElement>(value).forEach(toggle)
						}
					})
				}
			}
		}
	})

declare module globalThis {
	const CYDON_NO_TOGGLE: boolean | undefined
}