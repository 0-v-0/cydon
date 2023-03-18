/* emmetLite v1.2.2 */

export const itags = {// default elements
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
},
	tabbr = {// tagname abbreviations
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
	aabbr = {// attribute abbreviations
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
	eabbr = {// extended attributes
		css: ' rel="stylesheet"',
		print: ' rel="stylesheet" media="print"',
		favicon: ' rel="shortcut icon" type="image/x-icon" href="favicon.ico"',
		touch: ' rel="apple-touch-icon"',
		rss: ' rel="alternate" type="application/rss+xml" title="RSS"',
		atom: ' rel="alternate" type="application/atom+xml" title="Atom"',
		import: ' rel="import"',
		d: ' disabled="disabled"',
		hidden: ' type="hidden"',
		search: ' type="search"',
		email: ' type="email"',
		url: ' type="url"',
		pwd: ' type="password"',
		date: ' type="date"',
		dateloc: ' type="datetime-local"',
		tel: ' type="tel"',
		number: ' type="number"',
		checkbox: ' type="checkbox"',
		radio: ' type="radio"',
		range: ' type="range"',
		file: ' type="file"',
		submit: ' type="submit"',
		img: ' type="image"',
		button: ' type="button"',
		btn: ' type="button"',
	},
	tagProcs = [prop => {
		let { tag, taglist: list, result } = prop,
			s = tag.split(':'),
			t
		if (tag = s[0])
			for (t = tag.toLowerCase(); tabbr[t] && (t = tag.replace(t, tabbr[t])) != tag;) tag = t
		prop.tag = (tag || (t = list[list.length - 1]) && itags[t.toLowerCase()] ||
			(t = result[result.length - 1]) && itags[t.slice(1).replace(/[\s>][\S\s]*/, '').toLowerCase()] ||
			'div') + (eabbr[s[1]] || '')
	}]

// two fns for counting single line nest tokens (.a>.b^.c)
function countTokens(e, r) {
	function countChar(e, r) {
		let t = 0
		for (let l = e.length, n = 0; n < l; n++) e[n] == r && t++
		return t
	}
	return countChar(('' + e).replace(/[^\\]?".+?[^\\]"/g, '').replace(/[^\\]?'.+?[^\\]'/g, '').replace(/[^\\]?\{.+?[^\\]\}/g, ''), r)
}

// make `^>+` out of tabs (normally emmet does nesting like ".a>.b" and unnesting like ".b^.a_sibling", now we can use tabs)
function extractTabs(input, indent) {
	function getTabLevel(e) {
		try {
			return e.replace(RegExp(indent, 'g'), '\t').match(/^\t+/)[0].length
		} catch (e) {
			return 0
		}
	}
	let r = -1, l = 0, res = ''
	for (let i = 0; i < input.length;) {
		let j = i
		loop: do {
			switch (input[i++]) {
				case '\n':
					if (!l)
						break loop
					break
				case '{':
					if (l >= 0)
						l++
					break
				case '[':
					if (l < 1)
						l--
					break
				case '}':
					if (l > 0) l--
					break
				case ']':
					if (l < 0) l++
				default: break
			}
		} while (i < input.length)
		let line = input.substring(j, i)
		let level = getTabLevel(line, indent)
		let str = line.trim()
		const s = str
		if (str.length) {
			if (r >= 0) {
				if (level > r || str[0] == '*')
					str = '>' + str
				else if (level == r)
					str = '+' + str
				else if (level < r)
					str = '^'.repeat(r - level) + str
			}
			r = level + countTokens(s, '>') - countTokens(s, '^')
		}
		res += str
	}
	return res
}

function zencode(input, styleProc) {
	function closeTag(ret) {
		let tag = taglist.pop()
		if (tag && !/^!|^(area|base|br|col|embed|frame|hr|img|input|link|meta|param|source|wbr)$/i.test(tag)) {
			tag = '</' + tag + '>'
			return ret ? tag : result.push(tag)
		}
		return ''
	}
	input = input.replace(/<!--[\S\s]*?-->/g, '')
	let s = [], buffer, taglist = [], grouplist = [], lastgroup = [],
		result = [], c, l = 0,
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
					g = n + 1
					s.push(c)
				}
				break

			case '*':
				if (g < n && !l) {
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
				break
			default:
				if (!l && buffer == '}')
					s.push('+')
		}
		n++
		buffer = c
	}
	if (g < len)
		s.push(input.slice(g, len))
	for (i = 0, len = s.length; i < len; i++) {
		let set = s[i], tag = '', content = '', attr = [''],
			tags = [], lasttag, prevg
		switch (set) {
			case '^':
				lasttag = result[result.length - 1]
				if (lasttag && !lasttag.startsWith('</')) closeTag()
				closeTag()
			case '>':
				break
			case '+':
				lasttag = result[result.length - 1]
				if (lasttag && !lasttag.startsWith('</')) closeTag()
				break
			case '(':
				grouplist.push([result.length, taglist.length])
				break
			case ')':
				prevg = grouplist[grouplist.length - 1]
				l = prevg[1]
				for (g = taglist.length; g-- > l;) closeTag()
				lastgroup = result.slice(prevg[0])
				break
			default:
				if (set[n = 0] == '*') {
					g = parseInt(set.substring(1)) | 0
					if (lastgroup.length) {
						tags = lastgroup
						result.length = grouplist.pop()[0]
					} else if (result.length)
						tags.push(result.pop(), closeTag(true))
					for (; n < g; n++)
						for (let r = 0, l = tags.length; r < l; r++) {
							result.push(tags[r].replace(/(\$+)@(-?)(\d*)/g, (match, digs, direction, start) => {
								let v = ((direction == '-' ? -n : n) + (start | 0 || (direction == '-' ? g - 1 : 0))) + ''
								for (let d = 0, dlen = digs.length - v.length; d < dlen; d++)
									v = '0' + v
								return v
							}))
						}
				} else {
					lastgroup.length = 0
					n = /\{([\s\S]+)}|\[([\s\S]+?)]|([.#]?)([^[.#{\s]+(?:(?<=\$)\{[^}]+})?)/g
					while (l = n.exec(set)) {
						if (l[1])
							content = l[1]
						else if (l[2])
							attr.push(l[2].replace(/([^=\s]+)(=?)('[^']*'|"[^"]*"|[^"'\s]*)/g,
								(m, attr, s, c) => (aabbr[attr] || attr) + s +
									(s && c[0] != '"' && c[0] != "'" ? '"' + c + '"' : c)))
						else {
							buffer = l[4]
							if (l[3] == '#')
								attr.push('id="' + buffer + '"')
							else if (l[3] == '.')
								attr[0] += buffer + ' '
							else
								tag = styleProc(buffer || "", tag, attr, result)
						}
					}
					if (!content || tag || attr[0] || attr[1]) {
						content = { tag, taglist, attr, content, result }
						for (l of tagProcs)
							if (l(content))
								break
						if (attr[0])
							attr[0] = ' class="' + attr[0].trimEnd() + '"'
						if (tag = content.tag)
							result.push('<' + tag + attr.join(' ') + '>' + content.content)
						taglist.push(tag.replace(/(!|\s)[\S\s]*/g, ''))
					} else {
						result.push(content)
						taglist.push('')
					}
				}
		}
	}
	for (i = taglist.length; i--;) closeTag()
	return result.join('')
}

export default (input, indent, styleProc = tag => tag) => {
	if (indent)
		input = extractTabs(input, indent)
	return zencode(input, styleProc)
}