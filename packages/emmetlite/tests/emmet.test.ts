import { describe, expect, test } from 'vitest'
import emmet, { aabbr, eabbr, itags, tabbr, tagProcs } from '..'
import type { TagProp } from '..'

/** Raw format: no indent argument, so `>` / `+` / `^` carry the nesting. */
const raw = (s: string) => emmet(s)
/** Indented format: the indentation carries the nesting, as in a stylus file. */
const indented = (s: string, indent = '\t') => emmet(s, indent)

/** The tags zencode's closeTag() treats as self-closing. */
const VOID = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'frame',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'wbr',
])

describe('basic syntax', () => {
	test.each([
		['span', '<span></span>'],
		['.block', '<div class="block"></div>'],
		['#t_01', '<div id="t_01"></div>'],
		['div>span', '<div><span></span></div>'],
		['div+span', '<div></div><span></span>'],
		['div>a^span', '<div><a></a></div><span></span>'],
		['input[type=checkbox checked]', '<input type="checkbox" checked>'],
		['div{text}', '<div>text</div>'],
		['div>{text}', '<div>text</div>'],
		['ol>li*3', '<ol><li></li><li></li><li></li></ol>'],
		['table>(tr>td)*3', '<table><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr></table>'],
		['!', '<!DOCTYPE html>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('recommended order: tag, id, class, attributes, content, count', () => {
		expect(raw('div#a.b[type=text]{hi}*2')).toBe(
			'<div class="b" type="text" id="a">hi</div><div class="b" type="text" id="a">hi</div>',
		)
	})

	test('`^` climbs one level and `^^` climbs two', () => {
		expect(raw('a>b>c^d')).toBe('<a><b><c></c></b><d></d></a>')
		expect(raw('a>b>c>d^^e')).toBe('<a><b><c><d></d></c></b><e></e></a>')
	})
})

describe('void elements', () => {
	test.each([...VOID])('%s gets no closing tag', tag => {
		expect(raw(tag)).toBe(`<${tag}>`)
	})

	test('the void check is case-insensitive', () => {
		expect(raw('BR')).toBe('<BR>')
		expect(raw('IMG')).toBe('<IMG>')
	})

	test('a void element does not swallow its siblings', () => {
		expect(raw('br+span')).toBe('<br><span></span>')
		expect(raw('img>span')).toBe('<img><span></span>')
	})

	test('other HTML tags are ordinary containers', () => {
		expect(raw('p')).toBe('<p></p>')
		expect(raw('a')).toBe('<a></a>')
		expect(raw('table')).toBe('<table></table>')
	})
})

describe('counting with *', () => {
	test.each([
		['li*3', '<li></li><li></li><li></li>'],
		['div*2', '<div></div><div></div>'],
		['*0', ''],
		['*-1', ''],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('repeats the previous tag, including its attributes', () => {
		expect(raw('span+li*2')).toBe('<span></span><li></li><li></li>')
		expect(raw('div.a.b*2')).toBe('<div class="a b"></div><div class="a b"></div>')
	})

	test('repeats the previous tag when it sits in a group', () => {
		expect(raw('(ul>li)*2')).toBe('<ul><li></li></ul><ul><li></li></ul>')
	})
})

describe('groups with ()', () => {
	test.each([
		['(div)', '<div></div>'],
		['(div)(span)', '<div></div><span></span>'],
		['(div+p)', '<div></div><p></p>'],
		['(div+p)*2', '<div></div><p></p><div></div><p></p>'],
		['div>(span+a)*2', '<div><span></span><a></a><span></span><a></a></div>'],
		['(a>b>c^d)*2', '<a><b><c></c></b><d></d></a><a><b><c></c></b><d></d></a>'],
		['(div>span+p)*2', '<div><span></span><p></p></div><div><span></span><p></p></div>'],
		['(ul>.t)*2', '<ul><li class="t"></li></ul><ul><li class="t"></li></ul>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('an inner count survives inside a repeated group', () => {
		expect(raw('div>(span*2+p)*2')).toBe(
			'<div><span></span><span></span><p></p><span></span><span></span><p></p></div>',
		)
	})
})

describe('numbering with $ and @', () => {
	test.each([
		// The `@` is what arms the substitution; a bare `$` is left in place.
		['div#t_$$@*3', '<div id="t_00"></div><div id="t_01"></div><div id="t_02"></div>'],
		['div#t_$@*3', '<div id="t_0"></div><div id="t_1"></div><div id="t_2"></div>'],
		['div#t_$@2*3', '<div id="t_2"></div><div id="t_3"></div><div id="t_4"></div>'],
		['div#t_$$@3*3', '<div id="t_03"></div><div id="t_04"></div><div id="t_05"></div>'],
		// `@-n` counts down from n.
		['div#t_$$@-*3', '<div id="t_02"></div><div id="t_01"></div><div id="t_00"></div>'],
		['div#t_$$@-1*3', '<div id="t_01"></div><div id="t_00"></div><div id="t_-1"></div>'],
		['span{$@-5}*3', '<span>5</span><span>4</span><span>3</span>'],
		['li{$@}*3', '<li>0</li><li>1</li><li>2</li>'],
		['li{$@2}*3', '<li>2</li><li>3</li><li>4</li>'],
		['li{$@11}*3', '<li>11</li><li>12</li><li>13</li>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('a bare $ is preserved when there is no @ (documented difference #3)', () => {
		expect(raw('div#t_$$*3')).toBe(
			'<div id="t_$$"></div><div id="t_$$"></div><div id="t_$$"></div>',
		)
		expect(raw('li{$}*3')).toBe('<li>$</li><li>$</li><li>$</li>')
		expect(raw('li.item$*3')).toBe(
			'<li class="item$"></li><li class="item$"></li><li class="item$"></li>',
		)
		expect(raw('(ul>.t${$})(ul>.t${$})*1')).toBe(
			'<ul><li class="t${$}"></li></ul><ul><li class="t${$}"></li></ul>',
		)
	})

	test('the number is zero-padded to the width of the $ run', () => {
		expect(raw('li{$$@}*3')).toBe('<li>00</li><li>01</li><li>02</li>')
		expect(raw('li{$$$@}*3')).toBe('<li>000</li><li>001</li><li>002</li>')
	})

	test('the $ substitution reaches attributes and classes too', () => {
		expect(raw('li.item$@*3')).toBe(
			'<li class="item0"></li><li class="item1"></li><li class="item2"></li>',
		)
	})
})

describe('implicit tag names', () => {
	test.each([
		['ul>.a', '<ul><li class="a"></li></ul>'],
		['ol>.a', '<ol><li class="a"></li></ol>'],
		['table>.a', '<table><tr class="a"></tr></table>'],
		['tr>.a', '<tr><td class="a"></td></tr>'],
		['dl>.a', '<dl><dt class="a"></dt></dl>'],
		['select>.a', '<select><option class="a"></option></select>'],
		['menu>.a', '<menu><menuitem class="a"></menuitem></menu>'],
		['picture>.a', '<picture><img class="a"></picture>'],
		['map>.a', '<map><area class="a"></map>'],
		['html>.a', '<html><body class="a"></body></html>'],
	])('%s infers the child element', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('falls back to div when there is no implicit child', () => {
		expect(raw('.a')).toBe('<div class="a"></div>')
		expect(raw('div>.a')).toBe('<div><div class="a"></div></div>')
		expect(raw('p>.a')).toBe('<p><div class="a"></div></p>')
	})

	test('an explicit tag before the class wins over inference', () => {
		expect(raw('ul>li>.a')).toBe('<ul><li><div class="a"></div></li></ul>')
	})

	test('`.{content}` keeps the parent as the text container (difference #6)', () => {
		expect(raw('ul>.{a}')).toBe('<ul>a</ul>')
	})
})

describe('attributes', () => {
	test.each([
		['div[x=1 y=2]', '<div x="1" y="2"></div>'],
		['div[data-x=1]', '<div data-x="1"></div>'],
		['div[a=b=c]', '<div alt="b=c"></div>'],
		['a[href=http://x.com/a?b=c]', '<a href="http://x.com/a?b=c"></a>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('a valueless attribute gets no value', () => {
		expect(raw('input[type=checkbox checked]')).toBe('<input type="checkbox" checked>')
	})

	test('unquoted values are quoted and single-quoted values are kept', () => {
		expect(raw('img[width=300]')).toBe('<img width="300">')
		expect(raw("img[src='1.webp']")).toBe("<img src='1.webp'>")
		expect(raw('img[src=1.webp alt="foo bar"]')).toBe('<img src="1.webp" alt="foo bar">')
	})

	test('output order is class, then attributes, then id', () => {
		expect(raw('tag#id.cls[attr=v]')).toBe('<tag class="cls" attr="v" id="id"></tag>')
	})

	test('dots in the class list become spaces', () => {
		expect(raw('div.a.b.c')).toBe('<div class="a b c"></div>')
		expect(raw('div#i.a.b')).toBe('<div class="a b" id="i"></div>')
	})

	test('attribute abbreviations expand, and the value is quoted afterwards', () => {
		expect(raw('div[t=hi tt=hello w=10 h=2 l=en n=x]')).toBe(
			'<div type="hi" title="hello" width="10" height="2" lang="en" name="x"></div>',
		)
		expect(raw('img[src=a.png im=email a=alt]')).toBe(
			'<img src="a.png" inputmode="email" alt="alt">',
		)
	})

	test('a short name that collides with an abbreviation is expanded, not kept', () => {
		// `a` is shorthand for `alt`, so `div[a=1]` cannot mean a bare `a`.
		expect(raw('div[a=1]')).toBe('<div alt="1"></div>')
		expect(raw('div[alt=1]')).toBe('<div alt="1"></div>')
		expect(raw('div[alt=1 x=2]')).toBe('<div alt="1" x="2"></div>')
	})

	test('degenerate attribute blocks do not crash', () => {
		expect(raw('div[]')).toBe('<div></div>')
		expect(raw('div[a=]')).toBe('<div alt=""></div>')
	})
})

describe('content', () => {
	test.each([
		['div{}', '<div></div>'],
		['div{{a}}', '<div>{a}</div>'],
		['div{a{b}}', '<div>a{b}</div>'],
		['p>{1}{2}', '<p>12</p>'],
		['{text}', 'text'],
		['{a}{b}', 'ab'],
		['{note}div', 'note<div></div>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('content may contain a closing tag sequence', () => {
		expect(raw('div>{text</div>}')).toBe('<div>text</div></div>')
	})

	test('a bare content block becomes a sibling', () => {
		expect(raw('div{a}b{c}')).toBe('<div>a</div><b>c</b>')
	})
})

describe('tag abbreviations', () => {
	// Driven off the exported map so a new entry is covered automatically.
	// Anything starting with `!` is left unclosed, like the void tags.
	test.each(Object.entries(tabbr))('%s -> %s', (abbr, tag) => {
		const closes = !tag.startsWith('!') && !VOID.has(tag.toLowerCase())
		expect(raw(abbr)).toBe(closes ? `<${tag}></${tag}>` : `<${tag}>`)
	})

	test('abbreviations compose with nesting and attributes', () => {
		expect(raw('sel>opt')).toBe('<select><option></option></select>')
		expect(raw('fm>inp[t=email]')).toBe('<form><input type="email"></form>')
	})

	test('an unknown abbreviation is left as a literal tag name', () => {
		expect(raw('lbl')).toBe('<lbl></lbl>')
		expect(raw('p')).toBe('<p></p>')
	})

	test('extended attributes are appended after the tag name (tag:ext)', () => {
		expect(raw('link:css')).toBe('<link rel="stylesheet">')
		expect(raw('link:favicon')).toBe(
			'<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">',
		)
		expect(raw('link:rss')).toBe('<link rel="alternate" type="application/rss+xml" title="RSS">')
		expect(raw('input:checkbox')).toBe('<input type="checkbox">')
		expect(raw('input:d')).toBe('<input disabled="disabled">')
		expect(raw('btn:button')).toBe('<button type="button"></button>')
	})

	test('an unknown :ext adds nothing', () => {
		expect(raw('input:txt')).toBe('<input>')
		expect(raw('input:notarealext')).toBe('<input>')
	})
})

describe('differences from official Emmet', () => {
	// These lock in the deviations the package README documents. A change here
	// is a deliberate API change, not a regression — update both together.

	test('#1 attributes are space-separated, and a second [] is dropped', () => {
		expect(raw('tag#id.a.b[attributes="sepearated by" spaces]')).toBe(
			'<tag class="a b" attributes="sepearated by" spaces id="id"></tag>',
		)
		expect(raw('a[href=#][data-b=b]')).toBe('<a href="#"></a>')
		expect(raw('a[href=x][rel=y]')).toBe('<a href="x"></a>')
	})

	test('#2 raw HTML tags are not recognised as tags', () => {
		expect(raw('<h1>1</h1>')).toBe('<<h1><1</h1></1</h1></<h1>')
	})

	test('#4 a trailing * swallows the whole abbreviation', () => {
		expect(raw('a*')).toBe('')
		expect(raw('div*')).toBe('')
		expect(raw('div{a}*')).toBe('')
		expect(raw('div>*')).toBe('')
		expect(raw('{comment}*')).toBe('')
	})

	test('#5 ! expands to the doctype', () => {
		expect(raw('!')).toBe('<!DOCTYPE html>')
		expect(raw('!+html')).toBe('<!DOCTYPE html><html></html>')
	})

	test('#8 HTML comments are stripped', () => {
		expect(raw('<!-- a comment -->div')).toBe('<div></div>')
		expect(raw('div<!-- x -->+span')).toBe('<div></div><span></span>')
	})

	test('#9 unquoted values are quoted; the example from the docs', () => {
		expect(raw("img[src='1.webp' alt=\"foo bar\" width=300]")).toBe(
			'<img src=\'1.webp\' alt="foo bar" width="300">',
		)
	})

	test('#10 bracketed values survive when double-quoted (docs examples)', () => {
		// Unquoted brackets are truncated even when balanced: `a[data-a=[]]`
		// yields data-a="[", so the docs require double quotes around any
		// bracket-containing value.
		expect(raw('img[alt="[a] alt text" src=x.png]')).toBe(
			'<img alt="[a] alt text" src="x.png">',
		)
		expect(raw('a[data-a="[[]" data-b="[]]"]{foo}b[data-a="[]" data-b="[]"]{bar}')).toBe(
			'<a data-a="[[]" data-b="[]]">foo</a><b data-a="[]" data-b="[]">bar</b>',
		)
		expect(raw('a[data-a=[]]')).toBe('<a data-a="["></a>')
	})
})

describe('indented format', () => {
	test.each([
		['a\n\tb', '<a><b></b></a>'],
		['a\n\t\tb\n\tc', '<a><b></b></a><c></c>'],
		['a\n\tb\nc', '<a><b></b></a><c></c>'],
		['a', '<a></a>'],
		['', ''],
	])('%j', (input, expected) => {
		expect(indented(input)).toBe(expected)
	})

	test('the indent unit may be any repeated whitespace', () => {
		expect(indented('a\n\tb', '  ')).toBe('<a><b></b></a>')
		expect(indented('a\n  b', '  ')).toBe('<a><b></b></a>')
		expect(indented('a\n\t\t\tb', '  ')).toBe('<a><b></b></a>')
	})

	test('a falsy indent falls back to raw format', () => {
		// Without an indent unit the newlines carry no meaning, so only the
		// first line survives.
		expect(emmet('a\n\tb', undefined)).toBe('<a></a>')
		expect(emmet('a\n\tb', '')).toBe('<a></a>')
	})

	test('same-level lines become siblings', () => {
		expect(indented('div\n\tp\n\tspan')).toBe('<div><p></p><span></span></div>')
		expect(indented('div\n\tp\n\t\tb\n\tp')).toBe('<div><p><b></b></p><p></p></div>')
	})

	test('a line carrying a count repeats the previous tag', () => {
		expect(indented('ul\n\tli*3')).toBe('<ul><li></li><li></li><li></li></ul>')
		// A trailing `>` opens a level that the next line's own indentation
		// does not re-enter, so the li's land outside the ul.
		expect(indented('ul>\n\tli*3')).toBe('<ul></ul><li></li><li></li><li></li>')
	})

	test('indentation and inline operators mix', () => {
		expect(indented('div\n\tul>.a')).toBe('<div><ul><li class="a"></li></ul></div>')
		expect(indented('div\n\t.a>.b\n\t.c+.d')).toBe(
			'<div><div class="a"><div class="b"></div></div><div class="c"></div><div class="d"></div></div>',
		)
	})

	test('indentation alone nests, with no operator at all', () => {
		expect(indented('div\n\tul\n\t\tli>a')).toBe('<div><ul><li><a></a></li></ul></div>')
	})

	test('an operator inside a value does not change the nesting level', () => {
		expect(indented('div\n\t{a>b}')).toBe('<div>a>b</div>')
	})

	test('the README multi-line example', () => {
		expect(
			indented('!\nhtml\n  head\n    link:favicon\n  .\n    h1{Hello world!}', '  '),
		).toBe(
			'<!DOCTYPE html><html><head>' +
				'<link rel="shortcut icon" type="image/x-icon" href="favicon.ico">' +
				'</head><body><h1>Hello world!</h1></body></html>',
		)
	})

	test('a group line keeps its own inline count', () => {
		expect(
			indented(
				'!\nhtml\n\t.\n\t\ttable\n\t\t\t.\n\t\t\t\tth{$@3}*3\n\t\t\t(#l_$\n\t\t\t\ttd{$@-5}*3)*2',
				'\t',
			),
		).toBe(
			'<!DOCTYPE html><html><body><table>' +
				'<tr><th>3</th><th>4</th><th>5</th></tr>' +
				'<tr id="l_$"><td>5</td><td>4</td><td>3</td></tr>' +
				'<tr id="l_$"><td>5</td><td>4</td><td>3</td></tr>' +
				'</table></body></html>',
		)
	})
})

describe('degenerate input', () => {
	test.each(['', '>', '+', '^^', 'div>', '>+span', '()', '(', 'a>b', '   '])(
		'%j does not crash',
		input => {
			expect(() => raw(input)).not.toThrow()
		},
	)

	test('produces empty output for empty-ish input', () => {
		expect(raw('')).toBe('')
		expect(raw('>')).toBe('')
		expect(raw('+')).toBe('')
		expect(raw('^^')).toBe('')
		expect(raw('()')).toBe('')
	})

	test('a dangling `>` still emits the tag', () => {
		expect(raw('div>')).toBe('<div></div>')
		expect(raw('>+span')).toBe('<span></span>')
	})

	test('an unclosed ( is tolerated', () => {
		expect(raw('(div')).toBe('<div></div>')
	})
})

describe('unbalanced parentheses (known bug)', () => {
	// A `)` with no matching `(` makes zencode destructure `undefined` at
	// index.js:297 and throw. Asserting the crash keeps it visible: if these
	// start passing, zencode was fixed and the expectations need updating.
	test.fails.each([')', 'div)', 'a>b)', 'ul>li)', '^)', 'div[])]'])('%j throws', input => {
		expect(() => raw(input)).not.toThrow()
	})

	test('other unbalanced closing delimiters do not throw, they produce malformed tags', () => {
		// Only an unmatched `)` reaches the groups[] destructure. Everything
		// else is swallowed or emitted verbatim as a tag name. The inputs are
		// spelled as code points because the bracket literals are unreadable
		// inline; the character form is noted on each line.
		const delims = (codes: number[]) => codes.map(c => String.fromCharCode(c)).join('')
		expect(raw(delims([125]))).toBe('<}></}>') // }
		expect(raw(delims([93]))).toBe('<]></]>') // ]
		expect(raw(delims([125, 93]))).toBe('<}]></}]>') // }]
		expect(raw(delims([40, 93]))).toBe('<]></]>') // (]
		expect(raw(delims([91, 93, 93]))).toBe('<div ]></div>') // ][
		expect(raw(delims([123, 93]))).toBe('<div></div>') // {]
		expect(raw(delims([91, 125]))).toBe('<div></div>') // [}
		expect(raw(delims([91, 41]))).toBe('<div></div>') // [)
	})
})

describe('malformed output that is not reported as an error', () => {
	// These inputs are invalid emmet but the parser returns a string rather
	// than throwing. Each is a candidate for validation.
	test.each([
		['A comment img[src=1.webp]', '<A></A>'],
		['div > span', '<div><div></div></div>'],
		['div*2*3', '<div></div><div></div></div></div>'],
		['div{a}*', ''],
		['(div)*', ''],
		['div#t_$@0.5*3', '<div class="5" id="t_0"></div><div class="5" id="t_1"></div><div class="5" id="t_2"></div>'],
		['<h1>1</h1>', '<<h1><1</h1></1</h1></<h1>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})
})

describe('extension API', () => {
	test('the shorthand maps are exported', () => {
		expect(itags.ul).toBe('li')
		expect(tabbr.btn).toBe('button')
		expect(aabbr.tt).toBe('title')
		expect(eabbr.css).toBe(' rel="stylesheet"')
	})

	test('mutating tabbr adds a custom tag abbreviation', () => {
		tabbr.myel = 'my-element'
		try {
			expect(raw('myel')).toBe('<my-element></my-element>')
		} finally {
			delete tabbr.myel
		}
		expect(raw('myel')).toBe('<myel></myel>')
	})

	test('mutating itags adds a custom default child', () => {
		itags['my-list'] = 'my-item'
		try {
			expect(raw('my-list>.a')).toBe('<my-list><my-item class="a"></my-item></my-list>')
		} finally {
			delete itags['my-list']
		}
	})

	test('mutating aabbr and eabbr reaches the output', () => {
		aabbr.mine = 'data-mine'
		eabbr.mine = ' data-kind="mine"'
		try {
			expect(raw('div[mine=1]')).toBe('<div data-mine="1"></div>')
			expect(raw('input:mine')).toBe('<input data-kind="mine">')
		} finally {
			delete aabbr.mine
			delete eabbr.mine
		}
	})

	test('a tagProcs entry can rewrite the tag and short-circuit', () => {
		const custom = (prop: TagProp): boolean | void => {
			if (prop.token.startsWith('x-')) {
				prop.tag = 'custom-el'
				return true
			}
		}
		tagProcs.unshift(custom)
		try {
			expect(raw('x-foo')).toBe('<custom-el></custom-el>')
			// Returning undefined falls through to the builtin proc.
			expect(raw('span')).toBe('<span></span>')
		} finally {
			tagProcs.shift()
		}
		expect(raw('x-foo')).toBe('<x-foo></x-foo>')
	})

	test('a tagProcs entry can append to attr and let the builtin run', () => {
		tagProcs.unshift(prop => {
			prop.attr.push('data-seen="1"')
		})
		try {
			expect(raw('span.a[x=1]{c}')).toBe('<span class="a" x="1" data-seen="1">c</span>')
		} finally {
			tagProcs.shift()
		}
	})

	test('a tagProcs entry receives the full TagProp', () => {
		let seen: TagProp | undefined
		tagProcs.unshift(prop => {
			seen = prop
			prop.tag = 'div'
			return true
		})
		try {
			raw('span#i.a[x=1]{c}')
		} finally {
			tagProcs.shift()
		}
		expect(seen).toBeDefined()
		expect(seen!.token).toBe('span#i.a[x=1]{c}')
		expect(seen!.match).toBe('span#i.a[x=1]{c}')
		expect(seen!.content).toBe('c')
		// class, then attributes, then id — the order they are emitted in.
		expect(seen!.attr).toEqual([' class="a"', 'x="1"', 'id="i"'])
		expect(Array.isArray(seen!.result)).toBe(true)
		expect(Array.isArray(seen!.tags)).toBe(true)
	})

	test('a tagProcs entry can force a void element', () => {
		tagProcs.unshift(prop => {
			prop.tag = 'br'
			return true
		})
		try {
			expect(raw('div.a')).toBe('<br class="a">')
		} finally {
			tagProcs.shift()
		}
	})

	test('a tagProcs entry may clear the tag entirely', () => {
		tagProcs.unshift(prop => {
			prop.tag = ''
			return true
		})
		try {
			expect(raw('div')).toBe('')
		} finally {
			tagProcs.shift()
		}
	})

	test('the builtin proc drops an unknown :ext from the tag name', () => {
		// `div:x` has no eabbr entry for `x`, and the builtin proc discards
		// everything after the colon rather than keeping it in the tag name.
		tagProcs.unshift(prop => {
			prop.tag = 'div:x'
		})
		try {
			expect(raw('div')).toBe('<div></div>')
		} finally {
			tagProcs.shift()
		}
	})
})

describe('exhaustive extension table coverage', () => {
	// Driven off the exported maps so a typo in any single entry fails here.

	test.each(Object.entries(itags))('%s infers <%s> as its child', (tag, child) => {
		expect(raw(`${tag}>.a`)).toContain(`<${child} class="a"`)
	})

	test.each(Object.entries(aabbr))('%s expands to %s', (abbr, name) => {
		expect(raw(`div[${abbr}=v]`)).toBe(`<div ${name}="v"></div>`)
	})

	test.each(Object.entries(eabbr))('div:%s appends %s', (ext, attrs) => {
		expect(raw(`div:${ext}`)).toBe(`<div${attrs}></div>`)
	})
})

describe('operator adjacency', () => {
	// A space anywhere inside a token clears the operator flag, so the rest of
	// the token is never split. Whitespace before an operator is harmless.
	test.each([
		['div\t>span', '<div><span></span></div>'],
		['div\n>span', '<div><span></span></div>'],
		['div>span\r+br', '<div><span></span><br></div>'],
		['div\nspan', '<div></div>'],
		['div\rspan', '<div></div>'],
		[' div', '<div></div>'],
		['div ', '<div></div>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('a space after an operator silently rewrites the semantics', () => {
		// The tag after the space is dropped as a non-match at index 0, so the
		// implicit fallback element is emitted instead of the one intended.
		expect(raw('div > span')).toBe('<div><div></div></div>')
		expect(raw('div> span')).toBe('<div><div></div></div>')
		expect(raw('div>span> p')).toBe('<div><span><div></div></span></div>')
		expect(raw('div > span > p')).toBe('<div><div><div></div></div></div>')
		expect(raw('div> span\t')).toBe('<div><div></div></div>')
		expect(raw('div>span + span')).toBe('<div><span></span><div></div></div>')
		expect(raw('div + span')).toBe('<div></div><div></div>')
	})
})

describe('whitespace inside a token truncates the abbreviation', () => {
	// Only the leading prefix of a token is parsed; everything after the first
	// whitespace is discarded. None of these report an error.
	test.each([
		['comment div', '<comment></comment>'],
		['foo bar', '<foo></foo>'],
		['div a', '<div></div>'],
		['A comment img[src=1.webp]', '<A></A>'],
		['div.a b', '<div class="a"></div>'],
		['a+b c', '<a></a><b></b>'],
		['div{ x }', '<div> x </div>'],
		['div[ x=1]', '<div  x="1"></div>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('CR and vertical tab split a token like a space does', () => {
		expect(raw('div>\r\nspan')).toBe('<div><div></div></div>')
		expect(raw('div>\rspan')).toBe('<div><div></div></div>')
		expect(raw('div>\vspan')).toBe('<div><div></div></div>')
	})
})

describe('count, repeat and group mechanics', () => {
	test.each([
		['div{a}*2{b}', '<div>a</div><div>a</div>'],
		['{a}*3{b}', 'aaa'],
		['a*2+b', '<a></a><a></a><b></b>'],
		['a+b*2', '<a></a><b></b><b></b>'],
		['div*2+', '<div></div><div></div>'],
		['div*2>span', '<div></div><div></div><span></span>'],
		['div>span*2', '<div><span></span><span></span></div>'],
		['(div>span)*2', '<div><span></span></div><div><span></span></div>'],
		['(div{a})*3', '<div>a</div><div>a</div><div>a</div>'],
		['(div)*+span', '<span></span>'],
		['(div)+span', '<div></div><span></span>'],
		['(p>c)*2', '<p><c></c></p><p><c></c></p>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('nested groups multiply', () => {
		expect(raw('((a)*2)*3')).toBe('<a></a>'.repeat(6))
		expect(raw('((a+b)*2)*2')).toBe('<a></a><b></b>'.repeat(4))
		expect(raw('a>((b)*2)*3')).toBe('<a>' + '<b></b>'.repeat(6) + '</a>')
		expect(raw('(a(b)*2)*2')).toBe('<a><b></b><b></b></a>'.repeat(2))
		expect(raw('((a)*2)')).toBe('<a></a><a></a>')
		expect(raw('((a)*2)*1')).toBe('<a></a><a></a>')
		expect(raw('div>(a*2)*3')).toBe('<div>' + '<a></a>'.repeat(6) + '</div>')
	})

	test('a count after a repeated group repeats the group, not the tag', () => {
		expect(raw('(div>*3)*2')).toBe('<div></div>'.repeat(6))
	})

	test('repeated groups number their $ tags', () => {
		expect(raw('(#t_$@>b)*3')).toBe(
			'<div id="t_0"><b></b></div><div id="t_1"><b></b></div><div id="t_2"><b></b></div>',
		)
		expect(raw('(#t_$@)*3')).toBe(
			'<div id="t_0"></div><div id="t_1"></div><div id="t_2"></div>',
		)
		expect(raw('(a#t_$@+b)*2')).toBe('<a id="t_0"></a><b></b><a id="t_1"></a><b></b>')
	})

	test('$ arithmetic: @0 is a no-op start, negatives decrement, non-numeric tails stay literal', () => {
		expect(raw('div#t_$@0*3')).toBe(
			'<div id="t_0"></div><div id="t_1"></div><div id="t_2"></div>',
		)
		expect(raw('div#t_$@x*3')).toBe(
			'<div id="t_0x"></div><div id="t_1x"></div><div id="t_2x"></div>',
		)
		expect(raw('div#t_$@0.5*3')).toBe(
			'<div class="5" id="t_0"></div><div class="5" id="t_1"></div><div class="5" id="t_2"></div>',
		)
		expect(raw('div#t_$@@3*3')).toBe(
			'<div id="t_0@3"></div><div id="t_1@3"></div><div id="t_2@3"></div>',
		)
		expect(raw('div#t_$$@-1*3')).toBe(
			'<div id="t_01"></div><div id="t_00"></div><div id="t_-1"></div>',
		)
		expect(raw('div#t_$@-3*1')).toBe('<div id="t_3"></div>')
		expect(raw('li{$@3}*12')).toBe(
			'<li>' + Array.from({ length: 12 }, (_, i) => 3 + i).join('</li><li>') + '</li>',
		)
	})

	test('$ in content only counts when @ follows it', () => {
		expect(raw('div{a$b@c}*3')).toBe('<div>a$b@c</div>'.repeat(3))
		expect(raw('div{$@}*10')).toBe(
			'<div>' + Array.from({ length: 10 }, (_, i) => i).join('</div><div>') + '</div>',
		)
	})

	test('an unparseable count expands to nothing', () => {
		// `*` with no numeric suffix, a garbage suffix, or a count too large to
		// parse as an integer all expand the previous tag zero times.
		expect(raw('*3')).toBe('')
		expect(raw('*3 div')).toBe('')
		expect(raw('(*3)')).toBe('')
		expect(raw('(a)*')).toBe('')
		expect(raw('(div)*')).toBe('')
		expect(raw('div*abc')).toBe('')
		expect(raw('div*999999999999')).toBe('')
		expect(raw('div*2147483648')).toBe('')
		expect(raw('div**2')).toBe('')
		expect(raw('li*')).toBe('')
		expect(raw('div#t_$@*0')).toBe('')
	})

	test('a trailing * after a count emits stray close tags', () => {
		expect(raw('div*2*3')).toBe('<div></div><div></div></div></div>')
	})
})

describe('caret operator', () => {
	test.each([
		['^div', '<div></div>'],
		['^+div', '<div></div>'],
		['^^div', '<div></div>'],
		['a>b>c^^^d', '<a><b><c></c></b></a><d></d>'],
		['a>b>c>d^^e^^f', '<a><b><c><d></d></c></b><e></e></a><f></f>'],
		['a>b^^c>d', '<a><b></b></a><c><d></d></c>'],
		['(a>b*c^d)*2', '<a></a><d></d><a></a><d></d>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})
})

describe('doctype', () => {
	test.each([
		['!', '<!DOCTYPE html>'],
		['!+div', '<!DOCTYPE html><div></div>'],
		['!+!', '<!DOCTYPE html><!DOCTYPE html>'],
		['!+!+div', '<!DOCTYPE html><!DOCTYPE html><div></div>'],
		['(!)*2', '<!DOCTYPE html><!DOCTYPE html>'],
		['(!)+div', '<!DOCTYPE html><div></div>'],
		['h1+!', '<h1></h1><!DOCTYPE html>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('a doctype never opens a nesting level and never closes', () => {
		// closeTag skips any tag starting with `!`, so a doctype cannot be a
		// parent and is emitted in place instead.
		expect(raw('!>div')).toBe('<!DOCTYPE html><div></div>')
		expect(raw('(!>div)')).toBe('<!DOCTYPE html><div></div>')
		expect(raw('div>!')).toBe('<div><!DOCTYPE html></div>')
		expect(raw('div>!+span')).toBe('<div><!DOCTYPE html><span></span></div>')
		expect(raw('a>b>!')).toBe('<a><b><!DOCTYPE html></b></a>')
	})
})

describe('tag and class names keep their case', () => {
	test.each([
		['DIV', '<DIV></DIV>'],
		['Br', '<Br>'],
		['ImG', '<ImG>'],
		['InPuT', '<InPuT>'],
		['TAbLe', '<TAbLe></TAbLe>'],
		['Div.A', '<Div class="A"></Div>'],
		['a#i.A', '<a class="A" id="i"></a>'],
		['ul>.A', '<ul><li class="A"></li></ul>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})
})

describe('attribute values', () => {
	test('operators inside [] do not split the token', () => {
		expect(raw('div[x=a>b]')).toBe('<div x="a>b"></div>')
		expect(raw('div[x=a+b]')).toBe('<div x="a+b"></div>')
		expect(raw('div[x=a^b]')).toBe('<div x="a^b"></div>')
		expect(raw('div[x="a]{b"]')).toBe('<div x="a]{b"></div>')
		expect(raw('div[a="1=b"]')).toBe('<div alt="1=b"></div>')
		expect(raw('div[x="a>b c"]')).toBe('<div x="a>b c"></div>')
	})

	test.each([
		["div[a='']", "<div alt=''></div>"],
		['div[a=""]', '<div alt=""></div>'],
		['div[a="1" 2]', '<div alt="1" 2></div>'],
		['div[=a]', '<div =alt></div>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('a double-quoted value may contain a closing bracket', () => {
		expect(raw('div[x="a]b"]')).toBe('<div x="a]b"></div>')
	})

	test('a single-quoted value containing ] mangles the tag', () => {
		// Only the double-quoted form survives: with single quotes the value
		// stops at the quote and the rest is re-read as an attribute name.
		expect(raw("div[x='a]b']")).toBe(`<div x=""'a></div>`)
	})

	test('an unterminated quote drops the whole attribute block', () => {
		expect(raw('div[a="')).toBe('<div></div>')
	})
})

describe('degenerate input falls back to the implicit element', () => {
	test.each([
		['.', '<div></div>'],
		['#', '<div></div>'],
		['[', '<div></div>'],
		['{', '<div></div>'],
		['[]', '<div></div>'],
		['{}', '<div></div>'],
		['div#', '<div></div>'],
		['div.', '<div></div>'],
		['( )', '<div></div>'],
		['\r', '<div></div>'],
		['\v', '<div></div>'],
		['a{b', '<a></a>'],
		['{a', '<div></div>'],
	])('%s', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})

	test('unbalanced brackets and braces are swallowed without complaint', () => {
		expect(raw('div{a')).toBe('<div></div>')
		expect(raw('div[a=')).toBe('<div></div>')
		expect(raw('div[a')).toBe('<div></div>')
		expect(raw('div[a=b')).toBe('<div></div>')
		expect(raw('div[x=a}b')).toBe('<div></div>')
		expect(raw('div{a]')).toBe('<div></div>')
		expect(raw('div[]a')).toBe('<div></div>')
	})

	test.each([
		['div#1#2', '<div id="1"></div>'],
		['div.a.b#1#2', '<div class="a b#1#2"></div>'],
	])('%s keeps only the first occurrence', (input, expected) => {
		expect(raw(input)).toBe(expected)
	})
})

describe('indented format, edge cases', () => {
	test.each([
		// Blank and indentation-only lines contribute nothing.
		[['div\n\n\tspan', '\t'], '<div><span></span></div>'],
		[['\t', '\t'], ''],
		[['\n\tdiv', '\t'], '<div></div>'],
		[['\tdiv', '\t'], '<div></div>'],
		[['div\n\t', '\t'], '<div></div>'],
	])('%o', ([input, indent], expected) => {
		expect(indented(input, indent)).toBe(expected)
	})

	test('indentation deeper than one level still nests only one level', () => {
		expect(indented('div\n\t\tspan')).toBe('<div><span></span></div>')
	})

	test('indentation must start the line or the level resets', () => {
		expect(indented('div\n \tspan')).toBe('<div></div><span></span>')
		expect(indented('a\n\tb\t\nc')).toBe('<a><b></b></a><c></c>')
		expect(indented('a\n\tb\nc\nd')).toBe('<a><b></b></a><c></c><d></d>')
	})

	test('a line starting with * repeats the previous tag, wherever it sits', () => {
		expect(indented('div\n\t*3')).toBe('<div></div>'.repeat(3))
		expect(indented('div\n\t\t*2')).toBe('<div></div><div></div>')
		expect(indented('ul\n\tli\n\t\t*2')).toBe('<ul><li></li><li></li></ul>')
	})

	test('a line starting with / * / repeats instead of being a comment', () => {
		// The extractor cannot tell a comment from a repeat marker, so a
		// `/* ... */` line discards the whole document.
		expect(indented('div\n\t/*comment*/')).toBe('')
		expect(indented('div\n\t*')).toBe('')
	})

	test('indentation may be any repeated run of the same unit', () => {
		expect(indented('a', '   ')).toBe('<a></a>')
		expect(indented('a\n   b', '   ')).toBe('<a><b></b></a>')
		expect(indented('  a', '  ')).toBe('<a></a>')
	})
})

describe('the indent unit is interpolated into a RegExp unescaped', () => {
	// getTabLevel() builds RegExp(indent, 'g') from the raw unit. With a unit
	// made of regex metacharacters the level measurement is nonsense and the
	// line ends up parsed as a completely different abbreviation.
	test.each([
		[['a\n.b', '.'], '<a><div class="b"></div></a>'],
		[['a\n(x)b', '(x)'], '<a></a><x></x><b></b>'],
		[['a\n[ab]b', '[ab]'], '<a></a><div ab></div>'],
	])('%o', ([input, indent], expected) => {
		expect(indented(input, indent)).toBe(expected)
	})

	test('the prefix still nests as long as the unit matches it', () => {
		// `-` is literal, and `-*` still consumes the leading `-`, so both
		// land at level 1 even though the regex is loose.
		expect(indented('a\n-b', '-')).toBe('<a><-b></-b></a>')
		expect(indented('a\n-b', '-*')).toBe('<a><-b></-b></a>')
	})
})

describe('stress', () => {
	test('deep nesting does not overflow the stack', () => {
		expect(raw('d>'.repeat(10000))).toContain('<d>')
		expect(raw('d>'.repeat(10000)).endsWith('</d>')).toBe(true)
	})

	test('a large count renders every repetition', () => {
		const out = raw('li*1000')
		expect(out.split('<li></li>').length - 1).toBe(1000)
	})

	test('a long abbreviation round-trips', () => {
		expect(raw('div>.x'.repeat(200))).toContain('<div class="x">')
	})
})
