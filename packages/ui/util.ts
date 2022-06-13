export const bindAll = (selector: string | NodeList, evt: string, cb: EventListenerOrEventListenerObject | null, opt?: boolean | AddEventListenerOptions) => {
	for (const el of (typeof selector == "string" ? document.body.querySelectorAll(selector) : selector))
		el.addEventListener(evt, cb, opt);
},
	isDisabled = (element: Element) => {
		if (!element || element.nodeType != Node.ELEMENT_NODE ||
			element.classList.contains('disabled'))
			return true;

		return "disabled" in element && (element as any).disabled;
	}
