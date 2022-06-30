export const isDisabled = (el: Element) => {
	if (!el || el.nodeType != Node.ELEMENT_NODE ||
		el.classList.contains('disabled'))
		return true;

	return 'disabled' in el && (<any>el).disabled;
}
	/**
	* Trick to restart an element's animation
	*
	* @see https://www.charistheo.io/blog/2021/02/restart-a-css-animation-with-javascript/#restarting-a-css-animation
	*/
	,
	reflow = (element: HTMLElement) => element.offsetHeight,

	onDOMContentLoaded = (callback: (ev?: Event) => any) => {
		if (document.readyState == 'loading')
			document.addEventListener('DOMContentLoaded', callback);
		else
			callback();
	},

	isRTL = (e: HTMLElement) => (e || document.documentElement).dir == 'rtl'

export const isTargetElement = (element: Node, name: string) =>
	element.nodeType == 1 /* Node.ELEMENT_NODE */ && (<Element>element).localName == name

export const getSlotElementNodes = (slot: HTMLSlotElement) =>
	slot.assignedNodes().filter(el => el.nodeType == 1 /* Node.ELEMENT_NODE */)

export const querySlot = (el: HTMLElement, name: string) =>
	el.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
