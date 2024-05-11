export const delay = <T = void>(ms?: number) => new Promise<T>(resolve => setTimeout(resolve, ms))

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
			addEventListener('DOMContentLoaded', callback)
		else
			callback()
	}

export const isTargetElement = (node: Node, name: string) =>
	node.nodeType == 1 /* Node.ELEMENT_NODE */ && (<Element>node).localName == name

export const getSlotElementNodes = (slot: HTMLSlotElement) =>
	slot.assignedNodes().filter(el => el.nodeType == 1 /* Node.ELEMENT_NODE */)

export const querySlot = (el: Element, name: string) =>
	el.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
