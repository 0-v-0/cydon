import { Constructor as Ctor } from "cydon"
import Events, { Emitter, EventType } from "cydon/events"

export const EventOf = <T extends Object, Events extends Record<EventType, unknown>>(base: Ctor<T>) => {
	const E = class extends (<Ctor<Object>>base) {
		constructor(...args: any[]) {
			super(...args)
			Events(this)
		}
	}
	return <Ctor<T & Emitter<Events>>>E
}

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

export const querySlot = (el: HTMLElement, name: string) =>
	el.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
