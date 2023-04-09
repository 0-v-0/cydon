import { directives as d } from './directives'
import { Part, Results, Result, DOMAttr, Container } from './type'
import { getFunc } from './util'

function parse(s: string, attr = '') {
	const re = /(\$\{[\S\s]+?})|\$([_a-z]\w*)/gi
	let a = re.exec(s), lastIndex!: number
	if (!a)
		return null

	let vals = ''
	for (; a; a = re.exec(s)) {
		const [match, expr, prop] = a,
			start = re.lastIndex - match.length
		if (start)
			vals += s.substring(lastIndex, start)
		vals += expr || '${' + prop + '}'
		lastIndex = re.lastIndex
	}
	if (lastIndex < s.length)
		vals += s.substring(lastIndex)
	return {
		a: attr,
		deps: new Set<string>,
		f: getFunc('return`' + vals.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`')
	}
}

let map = new Map<string, Part>()
export function compile(results: Results, el: Container,
	directives = d, level = 0, i = 0, parent?: ParentNode) {
	let result: Results[number] | undefined
	if (level) {
		const attrs = (<Element>el).attributes
		// Find pattern in attributes
		if (attrs) {
			const exp = attrs[<any>'c-for']
			if (exp) {
				const val = exp.value
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

			next: for (let i = 0; i < attrs.length;) {
				const attr = <DOMAttr>attrs[i],
					name = attr.name
				for (const handler of directives) {
					const data = handler(attr, map, parent)
					if (data) {
						map.set(name, <Part>data)
						if (data.keep)
							++i
						else
							(<Element>el).removeAttribute(name)
						continue next
					}
				}
				const parts = parse(attr.value, name)
				if (parts)
					map.set(name, parts)
				++i
			}
			if (map.size) {
				results.push(level << 22 | i, result = map)
				map = new Map
			}
			if (customElements.get((<Element>el).tagName.toLowerCase())?.prototype.updateValue)
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