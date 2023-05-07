export * from './components'
export * from './util'

export const load = (name: string) => import(`./components/${name}.ts`)

/**
 * Auto load custom elements
 * @param el The root element to search for custom elements to load
 * @param shadow Whether or not to include shadow roots in the search
 * @param listen Whether or not to listen for import-html events
 * @returns A promise that resolves when all custom elements are loaded
 */
export function autoload(el: ParentNode, shadow = true, listen = true) {
	const promises = []
	for (const c of el.querySelectorAll(':not(:defined)'))
		promises.push(load(toPascalCase(c.getAttribute('is') || c.tagName)))

	if (shadow && el.nodeType == 1/*Node.ELEMENT_NODE*/) {
		!<undefined>function walk(el: Element) {
			const shadowRoot = el.shadowRoot
			if (shadowRoot)
				autoload(shadowRoot, true, listen)
			for (const child of el.children)
				walk(child)
		}(<Element>el)
	}

	if (listen)
		for (const frag of el.querySelectorAll('import-html'))
			frag.addEventListener('frag-replace', e => autoload(e.detail), { once: true })

	return Promise.all(promises)
}

/**
 * Wait for all custom elements in the root element to be defined
 * @param el Root element
 * @returns A promise that resolves when all custom elements are defined.
 */
export function whenAllDefined(el: Element) {
	const promises = []
	for (const c of el.querySelectorAll(':not(:defined)'))
		promises.push(customElements.whenDefined(c.getAttribute('is') || c.tagName.toLowerCase()))
	return Promise.all(promises)
}

/**
 * convert kebab-case to PascalCase
 * @param s kebab-case string
 * @returns PascalCase
 */
export const toPascalCase = (s: string) =>
	s.replace(/([^-]{2,})-?/g, (_, s) => s[0].toUpperCase() + s.substring(1).toLowerCase())