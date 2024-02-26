/* emmetLite v0.0.5 */

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
		let { tag, tags, result } = prop,
			s = tag.split(':'),
			t
		if (tag = s[0])
			for (t = tag.toLowerCase(); tabbr[t] && (t = tag.replace(t, tabbr[t])) != tag;) tag = t
		prop.tag = (tag || (t = tags[tags.length - 1]) && itags[t.toLowerCase()] ||
			(t = result[result.length - 1]) && itags[t.slice(1).replace(/[\s>].*/s, '').toLowerCase()] ||
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

function zencode(input) {
	function closeTag(ret) {
		let tag = tagList.pop()
		if (tag && !/^!|^(area|base|br|col|embed|frame|hr|img|input|link|meta|param|source|wbr)$/i.test(tag)) {
			tag = '</' + tag + '>'
			return ret ? tag : result.push(tag)
		}
		return ''
	}
	input = input.replace(/<!--.*?-->/gs, '')
	let tokens = [], buffer, tagList = [],
		groups = [], lastGroup = [], result = [],
		c, l = 0, i = 0, len = input.length,
		g = 0, n = 0, bracketAsToken = 1
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
			case ' ':
			case ':':
				bracketAsToken = 0
				break
			case '+':
			case '>':
			case '^':
				bracketAsToken = 1
			case '(':
			case ')':
				if (!l && bracketAsToken) {
					if (g < n)
						tokens.push(input.slice(g, n))
					g = n + 1
					tokens.push(c)
				}
				break

			case '*':
				if (g < n && !l) {
					tokens.push(input.slice(g, n))
					g = n
				}
				break

			case '}':
				if (l > 0) l--
				if (!l && g < n) {
					tokens.push(input.slice(g, n + 1))
					g = n + 1
				}
				break

			case ']':
				if (l < 0) l++
				break
			default:
				if (!l && buffer == '}')
					tokens.push('+')
		}
		n++
		buffer = c
	}
	if (g < len)
		tokens.push(input.slice(g, len))
	for (i = 0, len = tokens.length; i < len; i++) {
		let token = tokens[i], tag, content, attr = [''],
			tags = [], lastTag, p
		switch (token) {
			case '^':
				lastTag = result[result.length - 1]
				if (lastTag && !lastTag.startsWith('</')) closeTag()
				closeTag()
			case '>':
				break
			case '+':
				lastTag = result[result.length - 1]
				if (lastTag && !lastTag.startsWith('</')) closeTag()
				break
			case '(':
				groups.push([result.length, tagList.length])
				break
			case ')':
				[p, l] = groups[groups.length - 1]
				for (g = tagList.length; g-- > l;) closeTag()
				lastGroup = result.slice(p)
				break
			default:
				if (token[n = 0] == '*') {
					g = parseInt(token.substring(1)) | 0
					if (lastGroup.length) {
						tags = lastGroup
						result.length = groups.pop()[0]
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
					lastGroup.length = 0;
					[buffer, tag, p, content = ''] =
						/((?:[^[{\s]+(?:(?<=\$)\{[^}]+})?)*)(?:\[(.+?(?:".*?".*?)*)])?(?:\{(.+)})?/s.exec(token)
					if (p)
						attr.push(p.replace(/([^=\s]+)(=?)('[^']*'|"[^"]*"|[^"'\s]*)/g,
							(m, attr, s, c) => (aabbr[attr] || attr) + s +
								(s && c[0] != '"' && c[0] != "'" ? '"' + c + '"' : c)));
					[tag, ...l] = tag.split('.')
					attr[0] = l.join(' ');
					[tag, p] = tag.split('#')
					if (p)
						attr.push('id="' + p + '"')
					if (!content || tag || attr[0] || attr[1]) {
						content = { tag, tags: tagList, attr, content, match: buffer, token, result }
						for (const process of tagProcs)
							if (process(content))
								break
						if (attr[0])
							attr[0] = ' class="' + attr[0] + '"'
						if (tag = content.tag)
							result.push('<' + tag + attr.join(' ') + '>' + content.content)
						tagList.push(tag.replace(/(!|\s).*/gs, ''))
					} else {
						result.push(content)
						tagList.push('')
					}
				}
		}
	}
	for (i = tagList.length; i--;) closeTag()
	return result.join('')
}

export default (input, indent) => {
	if (indent)
		input = extractTabs(input, indent)
	return zencode(input)
}