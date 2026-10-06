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
	test.fails.each([')', 'div)', 'a>b)', 'ul>li)'])('%j throws', input => {
		expect(() => raw(input)).not.toThrow()
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
})
