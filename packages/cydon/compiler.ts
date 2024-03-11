import { Part, Results, Result, Container, DirectiveHandler } from './type'
import { toFunction } from './util'

function parse(s: string, attr = '') {
	const tokens = s.split(/\$([_a-z][\w.]*|\{.+?})/is)
	if (tokens.length < 2)
		return null

	let vals = '', i = 0
	for (const expr of tokens) {
		if (expr) {
			vals += i ?
				expr[0] == '{' ? '$' + expr : '${this.' + expr + '}' :
				expr
		}
		i ^= 1
	}
	return {
		a: attr,
		deps: new Set<string>,
		f: toFunction('return`' + vals.replace(/\\|`/g, '\\$&') + '`')
	}
}

const N = 22

let map = new Map<string, Part>()
/**
 * Compile a node and its children
 * @param results The compiled results
 * @param el The node to compile
 * @param directives The directive handlers
 * @param i The index of the node
 * @param parent The parent node (presents if in c-for)
 */
export function compile(results: Results, el: Container,
	directives: DirectiveHandler[], i = 0, parent?: ParentNode) {
	let result: Results[number] | undefined
	if (i >>> N) {
		const attrs = (<Element>el).getAttributeNames?.()
		// Find pattern in attributes
		if (attrs) {
			const val = (<Element>el).getAttribute('c-for')
			if (val != null) {
				if (val) {
					const [key, value] = val.split(';')
					if (import.meta.env.DEV && !value) {
						console.warn('invalid c-for expression: ' + val)
						return
					}
					const r: Result = []
					compile(r, (<HTMLTemplateElement>el).content, directives, 0, el.parentNode!)
					r.e = [value.trim(), ...key.split(/\s*,\s*/)]
					results.push(i, r)
				}
				return // skip children with c-for
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
				results.push(i, result = map)
				map = new Map
			}
			const tagName = (<Element>el).localName
			if (tagName == 'textarea' || customElements.get(tagName)?.prototype.updateValue)
				return // skip textarea and cydon elements
		}
	}
	const s = (<Element>el).shadowRoot
	if (s) {
		const r: Result = []
		compile(r, s, directives, 0, parent);
		r.s = s
		results.push(i, result = r)
	}
	let node = el.firstChild
	if (node && !result)
		results.push(i)
	i += 1 << N
	for (i &= -1 << N; node; node = node.nextSibling) {
		if (node.nodeType == 1/* Node.ELEMENT_NODE */)
			compile(results, <Element>node, directives, i, parent)
		if (node.nodeType == 3/* Node.TEXT_NODE */) {
			const parts = parse((<Text>node).data)
			if (parts)
				results.push(i, parts)
		}
		i++
	}
}
