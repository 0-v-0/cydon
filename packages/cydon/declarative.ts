import { bind, Cydon, CydonOption, Data } from '.'

export interface CydonElement extends Element {
	cydon: Cydon
	data: Data
}

function walk(el: Element, options?: CydonOption) {
	for (const child of el.children)
		walk(child)
	const data = el.getAttribute('c-data')
	if (data != null) {
		Object.assign(el, Function(`return ${data}`)())
		const cydon = bind(el, options);
		(<CydonElement>el).cydon = cydon;
		(<CydonElement>el).data = cydon.data
	}
}

addEventListener('DOMContentLoaded', () => walk(document.body))