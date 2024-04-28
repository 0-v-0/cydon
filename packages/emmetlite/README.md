# emmetlite

[![npm-v](https://img.shields.io/npm/v/emmetlite.svg)](https://npmjs.com/package/emmetlite)
[![npm-d](https://img.shields.io/npm/dt/emmetlite.svg)](https://npmjs.com/package/emmetlite)

Emmet implementation in javascript
一个轻量级的emmet实现

# Features
- Full Emmet syntax support.
- Added extension syntax, Supported custom default elements, custom tagname abbreviations, custom attribute abbreviations and custom extended attributes (through `tagProcs` parameters).
- contains only string operations and no DOM operations, so it has excellent performance and can be loaded asynchronously.
- only ~2KB (brotli'd)

# 特性
- 完整的emmet语法支持
- 添加了扩展语法，支持自定义默认元素、自定义标签名缩写、自定义属性缩写、自定义扩展属性（通过`tagProcs`参数）
- 仅含字符串操作，不含任何DOM操作，因此拥有极好的性能，可异步加载
- 仅 ~2KB (brotli'd)

# Installation
```js
import emmet from 'emmetlite'
```

# Usage
```js
emmet(input: string, intent?: string) => string
```
Parameters:
- `s`: emmet string
- `indent`: If null, use the original emmet format. Otherwise, use the indented format with `indent` as a indent unit.
参数：
- `s`: emmet字符串
- `indent`: 为空使用原始emmet格式，否则使用以`indent`为缩进单位的缩进格式

ex:
```js
emmet(".a>p") //<div class="a"><p></p></div>
emmet(`!
html
  head
    link:favicon
  .
    h1{Hello world!}
`,'  ')
//<!DOCTYPE html><html><head><link rel="shortcut icon" type="image/x-icon" href="favicon.ico"></head><body><h1>Hello world!</h1></body></html>
```

## 基本语法（原始格式）
参考：https://docs.emmet.io/abbreviations/syntax

| 元素 | 说明 | Emmet | HTML |
| --- | --- | --- | --- |
| 标签名 | 元素 | `span` | `<span></span>` |
| `.` | 类 | `.block` | `<div class="block"></div>` |
| `#` | id | `#t_01` | `<div id="t_01"></div>` |
| `>` | 子元素 | `div>span` | `<div><span></span></div>` |
| `+` | 兄弟节点 | `div+span` | `<div></div><span></span>` |
| `^` | 节点爬升 | `div>a^span` | `<div><a></a></div><span></span>` |
| `[]` | 属性 | `input[type=checkbox checked]` | `<input type="checkbox" checked>` |
| `{}` | 内容 | `div{text}` or `div>{text}` | `<div>text</div>` |
| `*` | 数量 | `ol>li*3` | `<ol><li></li><li></li><li></li></ol>` |
| `()` | 分组 | `table>(tr>td)*3` | `<table><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr></table>` |
| `$` | 数量语法糖 | `div#t_$$*3` | `<div id="t_01"></div><div id="t_02"></div><div id="t_03"></div>` |
| `@` | 数量起始位置和递减选项 | `span{$@-5}*3` | `<span>5</span><span>4</span><span>3</span>` |
推荐顺序：元素名+id+类+属性+内容+数量，如：`tag-name#id.class[attr=value]{content}*2`

与Emmet官方语法区别：
1. 属性以空格间隔，不支持一个标签带多个[]
	- `tag#id.classes.separated.by.dots.and[attributes="sepearated by" spaces]`→`<tag class="classes separated by dots and" id="id" attributes="sepearated by" spaces></tag>`
	- `a[href=#][data-b=b]`→`<a href="#][data-b=b"></a>`
2. 不支持HTML标签： `<h1>1</h1>`→`<h1><h1></h1></h1>`
3. 没有`*`操作时会保留`$`： `(ul>.t${$})(ul>.t${$})*1`→`<ul><li class="t$">$</li></ul><ul><li class="t0">0</li></ul>`
4. `*` 可放在末尾作为注释使用：`a*`→``
5. !DOCTYPE 缩写：`!`→`<!DOCTYPE html>`
6. `.`可用于代替不在`{`前的隐式标签名：
	- `ul>.a`→`<ul><li class="a"></li></ul>`
	- `ul>.{a}`→`<ul>a</ul>`
7. 行尾的`}`和`)`和同级标签间的`+`可省略（不推荐），但`]`和`[`之间的`+`不可省略
8. 支持多行注释(`{ ... }*`)
9. 不包含空格的属性值可省略引号，会自动添加双引号，单引号会被保留 ex: `A comment img[src='1.webp' alt="foo bar" width=300](hr`→`<img src='1.webp' alt="foo bar" width="300"><hr>`
10. 支持属性中包含`[`和`]`（若属性值包含不成对的括号，需要加上双引号），如:
	- `a[data-a=[[] data-b=[]]]{foo{1}}b[data-a=[] data-b=[]]{bar{2}`→`<a data-a="[[]" data-b="[]]">foo{1}</a><b data-a="[]" data-b="[]">bar{2</b>`
	- `a[data-a=[ data-b=]]+b[data-a=] data-b=[]`→`<a data-a="[" data-b="]"></a><b data-a="]" data-b="["></b>`
11. 支持自定义默认元素、自定义标签名缩写、自定义属性缩写、自定义扩展属性

## 基本语法（缩进格式）
原始格式缺乏可读性，所以推荐使用缩进格式代替原始格式。缩进格式用缩进和换行代替原始格式中的`>`、`+`和`^`

**示例：**

非缩进格式：`!+html>.>table>.>th{$@3}*3^(#l_$>td{$@-5}*3)*2`

缩进格式
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
缩进与原始格式可以混用，但不推荐这么做，例如：

```stylus
div
	.a>.b
	.c+.d
	(.e>.f)*2
```
等价于：
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