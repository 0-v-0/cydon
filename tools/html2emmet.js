!function (o, tabbr, aabbr, itags) {
	'use strict'
	function tabize(input, indent) {
		let s = [], c, l = 0,
			i = 0, len = input.length, g = 0, n = 0
		for (; i < len; i++) {
			c = input[i]
			switch (c) {
				case '{':
					if (l >= 0)
						l++
					break
				case '[':
					if (l < 1)
						l--
					break
				case '+':
				case '>':
				case '^':
				case '(':
				case ')':
					if (!l) {
						if (g < n)
							s.push(input.slice(g, n))
						g = n
					}
					break

				case '}':
					if (l > 0) l--
					if (!l && g < n) {
						s.push(input.slice(g, n + 1))
						g = n + 1
					}
					break

				case ']':
					if (l < 0) l++
			}
			n++
		}
		if (g < len)
			s.push(input.slice(g, len))
		let shift = ['\n'],
			deep = 0, str = '', t, f = [], o
		for (i = 0; i < 200; i++)
			shift.push(shift[i] + indent)
		for (i = 0, l = s.length; i < l; i++) {
			t = s[i].slice(1)
			c = s[i][0]
			str +=
				c == '(' ?
				(f.push(deep), t ? shift[deep] + t : '') :
				c == ')' ?
				(deep = f.pop(), t ? shift[deep] + t : '') :
				c == '>' ?
				o ? (o = !1, s[i]) :
					(deep++, t ? shift[deep] + t : '') :
				c == '+' ?
				t ? shift[deep] + t : '' :
				c == '^' ? (deep--,
				t ? shift[deep] + t : '') :
				(o = c == '<', s[i])
		}
		return str[0] == '\n' ? str.slice(1) : str
	}
	let abbr = {}, aab = {}, x
	for (x in tabbr)
		abbr[tabbr[x]] = x
	for (x in aabbr)
		aab[aabbr[x]] = x
	function convert(elem, parent) {
		let str = '', tag = elem.tagName, i, len, flag, children, val
		if (!tag)
			return str
		tag = tag.toLowerCase()
		flag = elem.hasAttributes()
		if (tag != (itags[parent] || 'div') || !flag)
			str += abbr[tag] || tag

		if (elem.id)
			str += '#' + elem.id
		val = elem.className.trim()
		if (val.length)
			str += '.' + elem.className.replace(/\s+/g, '.')

		if (flag) {
			let attrs = elem.attributes, attr

			for (i = 0, len = attrs.length; i < len; i++) {
				attr = attrs[i]
				if (!/\b(class|id)\b/.test(attr.name)) {
					if (flag) {
						str += '['
						flag = false
					}
					else str += ' '
					str += aab[val = attr.name] || val
					val = attr.value
					if (val)
						str += val.search(/\s/) >= 0 ? '="' + val + '"'
							: '=' + val;
				}
			}

			if (!flag) str += ']'
		}

		children = elem.childNodes
		len = children.length
		let childRets = [], ch, c
		if (len > 0) {
			for (i = 0; i < len; i++) {
				ch = children[i]
				c = ch.nodeType
				if (c != 1) {
					val = ch.nodeValue.trim()
					if (!val.length || (c != 3 && c != 8))
						continue
					let min = ch = 0, j
					flag = tag == 'script'
					val = val.replace(/\r?\n/g, flag ? '' : '<br>')
					for (j = 0; j < val.length; j++) {
						if (val[j] == '{') ch++
						else if (val[j] == '}') ch--
						else
							continue
						if (ch < min) min = ch
					}
					val = '{'.repeat(1 - min) + val
					if (ch) val += (flag ? '//' : '<!--') + '}'.repeat(ch) + '-->'
					childRets.push(val + (c == 8 ? '}*' : '}'))
				}
				ch = convert(ch, tag)
				if (ch)
					childRets.push(ch)
			}
		}
		else if (elem.content && (ch = convert(elem.content, tag))) //template
			childRets.push(ch)
		len = childRets.length
		if (len) {
			let ch = childRets[0][0]
			if (ch != '{') str += '>'
			str += childRets.join('+') + (ch != '{' ? '^' : '+')
			/*for (i = 0; i < len; ) {
				str += val = childRets[i]
				if(++i != len)
					str += val.slice(-1) == '}' ? '>' : '+'
			}*/
		}
		return str.replace(/(\^|\+)\+/g, '$1'); // TODO: Remove this hack
	}
	o.html2emmet = function (elem, indent, type = 'text/html') {
		let e = elem
		if (e.split)
			e = new DOMParser().parseFromString(elem, type).childNodes[0]
		e = convert(e).replace(/\n/g, '').replace(/\^\+|\+\^|>\^/g, '^').replace(/\^+$/, '')
		return indent ? tabize(e, indent) : e
	}
}(self,
{// tagname abbreviations
	'!': '!DOCTYPE html',
	ab: 'abbr',
	adr: 'address',
	ar: 'area',
	arti: 'article',
	asd: 'aside',
	bq: 'blockquote',
	btn: 'button',
	colg: 'colgroup',
	cap: 'caption',
	cmd: 'command',
	cv: 'canvas',
	dat: 'data',
	datg: 'datagrid',
	datl: 'datalist',
	det: 'details',
	dlg: 'dialog',
	emb: 'embed',
	fig: 'figure',
	figc: 'figcaption',
	fm: 'form',
	fset: 'fieldset',
	ftr: 'footer',
	hdr: 'header',
	ifr: 'iframe',
	inp: 'input',
	lab: 'label',
	leg: 'legend',
	mk: 'mark',
	obj: 'object',
	opt: 'option',
	optg: 'optgroup',
	out: 'output',
	pic: 'picture',
	pr: 'pre',
	prog: 'progress',
	scr: 'script',
	sect: 'section',
	sel: 'select',
	sm: 'samp',
	summ: 'summary',
	sp: 'span',
	src: 'source',
	str: 'strong',
	sty: 'style',
	tab: 'table',
	tbd: 'tbody',
	tft: 'tfoot',
	thd: 'thead',
	tpl: 'template',
	trk: 'track',
	txa: 'textarea',
	vid: 'video',
	wb: 'wbr'
},
{// attribute abbreviations
	a: 'alt',
	ak: 'accesskey',
	autocap: 'autocapitalize',
	ce: 'contenteditable',
	d: 'dir',
	dr: 'draggable',
	dz: 'dropzone',
	n: 'name',
	h: 'height',
	hid: 'hidden',
	im: 'inputmode',
	l: 'lang',
	s: 'style',
	sc: 'spellcheck',
	tt: 'title',
	ti: 'tabindex',
	t: 'type',
	v: 'value',
	w: 'width'
},
{// default elements
	audio: 'source',
	colgroup: 'col',
	datalist: 'option',
	details: 'summary',
	dl: 'dt',
	em: 'span',
	fieldset: 'legend',
	figure: 'figcaption',
	frameset: 'frame',
	html: 'body',
	input: 'input',
	label: 'input',
	map: 'area',
	menu: 'menuitem',
	menuitem: 'menuitem',
	ul: 'li',
	ol: 'li',
	picture: 'img',
	optgroup: 'option',
	select: 'option',
	table: 'tr',
	tbody: 'tr',
	thead: 'tr',
	tfoot: 'tr',
	tr: 'td',
	video: 'source',
})