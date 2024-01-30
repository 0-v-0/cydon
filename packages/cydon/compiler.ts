import { Part, Results, Result, Container, DirectiveHandler } from './type'
import { toFunction } from './util'

function parse(s: string, attr = '') {
	const re = /(\$\{.+?})|\$([_a-z][\w.]*)/gis
	let a = re.exec(s), lastIndex!: number
	if (!a)
		return null

	let vals = ''
	for (; a; a = re.exec(s)) {
		const [match, expr, prop] = a,
			start = re.lastIndex - match.length
		if (start)
			vals += s.substring(lastIndex, start)
		vals += expr || '${this.' + prop + '}'
		lastIndex = re.lastIndex
	}
	if (lastIndex < s.length)
		vals += s.substring(lastIndex)
	return {
		a: attr,
		deps: new Set<string>,
		f: toFunction('return`' + vals.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`')
	}
}

let map = new Map<string, Part>()
/**
 * Compile a node and its children
 * @param results The compiled results
 * @param el The node to compile
 * @param directives The directive handlers
 * @param level The level of the node
 * @param i The index of the node
 * @param parent The parent node (presents if in c-for)
 */
export function compile(results: Results, el: Container,
	directives: DirectiveHandler[], level = 0, i = 0, parent?: ParentNode) {
	let result: Results[number] | undefined
	if (level) {
		const attrs = (<Element>el).getAttributeNames?.()
		// Find pattern in attributes
		if (attrs) {
			const val = (<Element>el).getAttribute('c-for')
			if (val != null) {
				if (val) {
					const [key, value] = val.split(';')
					if (import.meta.env.DEV && !value) {
						console.warn('invalid v-for expression: ' + val)
						return
					}
					const r: Result = []
					compile(r, (<HTMLTemplateElement>el).content, directives, 0, 0, el.parentNode!)
					r.e = [value.trim(), ...key.split(/\s*,\s*/)]
					results.push(level << 22 | i, r)
				}
				return // skip children
			}
			// Find directives
			next: for (const name of attrs) {
				const value = (<Element>el).getAttribute(name)!
				for (const handler of directives) {
					const data = handler(name, value, <Element>el, map, parent)
					if (data) {
						map.set(name, <Part>data)
						if (!data.keep)
							(<Element>el).removeAttribute(name)
						continue next
					}
				}
				const parts = parse(value, name)
				if (parts)
					map.set(name, parts)
			}
			if (map.size) {
				results.push(level << 22 | i, result = map)
				map = new Map
			}
			const tagName = (<Element>el).localName
			if (tagName == 'textarea' || customElements.get(tagName)?.prototype.updateValue)
				return // skip cydon elements
		}
	}
	const s = (<Element>el).shadowRoot
	if (s) {
		const r: Result = []
		compile(r, s, directives, 0, 0, parent);
		r.s = s
		results.push(level << 22 | i, result = r)
	}
	let node: Node | null = el.firstChild
	if (node && !result)
		results.push(level << 22 | i)
	level++
	for (i = 0; node; node = node.nextSibling) {
		if (node.nodeType == 1/* Node.ELEMENT_NODE */)
			compile(results, <Element>node, directives, level, i, parent)
		if (node.nodeType == 3/* Node.TEXT_NODE */) {
			const parts = parse((<Text>node).data)
			if (parts)
				results.push(level << 22 | i, parts)
		}
		i++
	}
}