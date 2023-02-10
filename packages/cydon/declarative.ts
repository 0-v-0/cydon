import { Cydon } from '.'

function walk(el: Element) {
	for (const child of el.children)
		walk(child)
	const data = el.getAttribute('c-data')
	if (data != null) {
		Object.assign(el, Function('return ' + data).call(el))
		const cydon = new Cydon(el)
		cydon.mount(el)
	}
}

addEventListener('DOMContentLoaded', () => walk(document.body))