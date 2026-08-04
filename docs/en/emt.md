# EMT

Cydon uses EMT to replace regular HTML. EMT is a markup language based on Emmet syntax that looks similar to Stylus. EMT is not required, but it has the following advantages:
- More concise than HTML
- Supports component-based development

## Basic Syntax (Raw Format)
Reference: https://docs.emmet.io/abbreviations/syntax

| Element | Description | Emmet | HTML |
| --- | --- | --- | --- |
| Tag name | Element | `span` | `<span></span>` |
| `.` | Class | `.block` | `<div class="block"></div>` |
| `#` | id | `#t_01` | `<div id="t_01"></div>` |
| `>` | Child node | `div>span` | `<div><span></span></div>` |
| `+` | Sibling node | `div+span` | `<div></div><span></span>` |
| `^` | Node climb | `div>a^span` | `<div><a></a></div><span></span>` |
| `[]` | Attributes | `input[type=checkbox checked]` | `<input type="checkbox" checked>` |
| `{}` | Content | `div{text}` or `div>{text}` | `<div>text</div>` |
| `*` | Count | `ol>li*3` | `<ol><li></li><li></li><li></li></ol>` |
| `()` | Grouping | `table>(tr>td)*3` | `<table><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr></table>` |
| `$` | Count placeholder | `div#t_$$*3` | `<div id="t_01"></div><div id="t_02"></div><div id="t_03"></div>` |
| `@` | Count start position and decrement | `span{$@-5}*3` | `<span>5</span><span>4</span><span>3</span>` |

Recommended order: element name + id + class + attributes + content + count, e.g.: `tag-name#id.class[attr=value]{content}*2`

Differences from official Emmet syntax:
1. Multiple attributes are separated by spaces; a single tag with multiple `[]` is not supported.
   - `tag#id.classes.separated.by.dots.and[attributes="sepearated by" spaces]` → `<tag class="classes separated by dots and" id="id" attributes="sepearated by" spaces></tag>`
   - `a[href=#][data-b=b]` → `<a href="#][data-b=b"></a>`
2. HTML tags are not supported: `<h1>1</h1>` → `<h1><h1></h1></h1>`
3. Without the `*` operator, `$` is preserved: `(ul>.t${$})(ul>.t${$})*1` → `<ul><li class="t$">$</li></ul><ul><li class="t0">0</li></ul>`
4. `*` at the end can be used as a comment: `a*` → ``
5. DOCTYPE abbreviation: `!` → `<!DOCTYPE html>`
6. `.` can be used in place of the implicit tag name when not before `{`:
   - `ul>.a` → `<ul><li class="a"></li></ul>`
   - `ul>.{a}` → `<ul>a</ul>`
7. Trailing `}` and `)` and `+` between sibling tags at the end of a line can be omitted (not recommended), but `+` between `]` and `[` cannot be omitted.
8. Supports multi-line comments (`{ ... }*`)
9. Attribute values without spaces can omit quotes; double quotes will be added automatically. Single quotes are preserved. e.g.: `A comment img[src='1.avif' alt="foo bar" width=300](hr` → `<img src='1.avif' alt="foo bar" width="300"><hr>`
10. Supports `[` and `]` within attributes (if the attribute value contains whitespace or unbalanced brackets, quotes must be added), e.g.:
    - `a[data-a=[[] data-b=[]]]{foo{1}}b[data-a=[] data-b=[]]{bar{2}` → `<a data-a="[[]" data-b="[]]">foo{1}</a><b data-a="[]" data-b="[]">bar{2</b>`
    - `a[data-a=[ data-b=]]+b[data-a=] data-b=[]` → `<a data-a="[" data-b="]"></a><b data-a="]" data-b="["></b>`
11. Supports custom default elements, custom tag name abbreviations, custom attribute abbreviations, and custom extended attributes.

## Basic Syntax (Indented Format)
The raw format lacks readability, so the indented format is recommended instead. The indented format uses indentation and line breaks to replace `>`, `+`, and `^` in the raw format.

**Example:**

Non-indented format: `!+html>.>table>.>th{$@3}*3^(#l_$>td{$@-5}*3)*2`

Indented format:
```
!
html
	.
		table
			.
				th{$@3}*3
			(#l_$
				td{$@-5}*3)*2
```
HTML:
```html
<!DOCTYPE html>
<html>
	<body>
		<table>
			<tr>
				<th>3</th>
				<th>4</th>
				<th>5</th>
			</tr>
			<tr id="l_0">
				<td>5</td>
				<td>4</td>
				<td>3</td>
			</tr>
			<tr id="l_1">
				<td>5</td>
				<td>4</td>
				<td>3</td>
			</tr>
		</table>
	</body>
</html>
```
Indented and raw formats can be mixed, but this is not recommended. For example:

```stylus
div
	.a>.b
	.c+.d
	(.e>.f)*2
```
Is equivalent to:
```stylus
div
	.a
		.b
	.c
	.d
	.e
		.f
	.e
		.f
```

emt files can be categorized into Single File Components (SFC) and page templates based on usage.

## SFC
One emt file can only define one component.

### Example
a.emt:
```stylus
div
	custom-component
		b
```
custom-component.emt:
```stylus
section
	.foo
```
Is equivalent to:
```stylus
div
	custom-component
		section
			.foo
		b
```

## Page Templates
Page templates can be divided into global templates and general templates.

A global template is the template for all web pages, typically named page.emt. A typical global template looks like this:
```stylus
!
html
	head
		meta[charset=utf-8]
		meta[name=viewport content="width=device-width,initial-scale=1.0"]
		title{$doc_title}
	.
		{${include(REQUEST_PATH)}}
```
General templates can be included using `${include("<filepath>")}`.

## Directory Structure
- tpl, pages that cannot be directly accessed, typically used as templates
- public, directly accessible pages, typically with titles

For MPA, the hierarchy of emt files is as follows:

```
page.emt					Global template
├─index.emt					Home page
│  ├─component-one			Component 1
│  │  ├─sub-component-one	Sub-component
│  │  ├─sub-component-two	Sub-component
│  │  └─...					Other sub-components
│  │
│  ├─component-two	    	Component 2
│  │
│  └─...					Other components
│
├─a.emt						Page a
│  └─...					Components
│
└─...						Other pages
```
