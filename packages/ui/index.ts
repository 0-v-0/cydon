export * from './components'
export * from './util'

export const load = (name: string) => import(`./components/${name}.ts`)

function walk(el: ParentNode, callback: (shadow: ShadowRoot) => void) {
	const shadowRoot = (<Element>el).shadowRoot
	if (shadowRoot)
		callback(shadowRoot)
	for (const child of el.children)
		walk(child, callback)
}

/**
 * Auto load custom elements
 * @param node The root node to search for custom elements to load
 * @param loader The loader function to use
 * @param shadow Whether or not to include shadow roots in the search
 * @param listen Whether or not to listen for import-html events
 * @returns A promise that resolves when all custom elements are loaded
 */
export function autoload(node: ParentNode, loader = load, shadow = true, listen = true) {
	const results: Promise<any>[] = []
	!<undefined>function walkAndLoad(node: ParentNode) {
		for (const c of node.querySelectorAll(':not(:defined)'))
			results.push(loader(toPascalCase(c.getAttribute('is') || c.tagName)))
		if (shadow)
			walk(node, walkAndLoad)
		if (listen)
			for (const frag of node.querySelectorAll('import-html'))
				frag.addEventListener('frag-replace', e => autoload(e.detail, loader, shadow, true), { once: true })
	}(node)
	return Promise.all(results)
}

/**
 * Wait for all custom elements in the root node to be defined
 * @param node The root node to search for custom elements to load
 * @param shadow Whether or not to include shadow roots in the search
 * @returns A promise that resolves when all custom elements are defined.
 */
export function whenAllDefined(node: ParentNode, shadow = true) {
	const results = []
	!<undefined>function wait(node: ParentNode) {
		for (const c of node.querySelectorAll(':not(:defined)'))
			results.push(customElements.whenDefined(c.getAttribute('is') || c.tagName.toLowerCase()))
		if (shadow)
			walk(node, wait)
	}(node)
	return Promise.all(results)
}

/**
 * Convert kebab-case to PascalCase
 * @param s kebab-case string
 * @returns PascalCase
 */
export const toPascalCase = (s: string) =>
	s.replace(/([^-]+)-?/g, (_, s) => s[0].toUpperCase() + s.substring(1).toLowerCase())