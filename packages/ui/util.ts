export const isDisabled = (el: Element) => {
	if (!el || el.nodeType != Node.ELEMENT_NODE ||
		el.classList.contains('disabled'))
		return true;

	return 'disabled' in el && (<any>el).disabled;
}