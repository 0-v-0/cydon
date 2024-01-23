# EMT

Cydon使用EMT来替代常规的HTML，EMT是一个基于Emmet语法的标记语言，看起来很像Stylus，EMT不是必须的，但它有以下优点：
- 比HTML更简洁
- 支持组件化开发

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

emt文件按使用方式可分为单文件组件(SFC)和页面模板

## SFC
一个emt文件只能定义一个组件

### 例子
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
等价于：
```stylus
div
	custom-component
		section
			.foo
		b
```

## 页面模板
页面模板可分为全局模板和一般模板

全局模板是所有网页的模板，通常文件名为page.emt。一个典型的全局模板如下
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
一般模板可使用`${include("<filepath>")}`引入

## 目录结构
- tpl，不能直接访问的页面，通常作为模板使用
- public，可直接访问的页面，通常带有标题

对于MPA来说，各emt文件层级关系如下：

```
page.emt					全局模板
├─index.emt					首页
│  ├─component-one			组件1
│  │  ├─sub-component-one	子组件
│  │  ├─sub-component-two	子组件
│  │  └─...					其他子组件
│  │
│  ├─component-two	    	组件2
│  │
│  └─...					其他组件
│
├─a.emt						页面a
│  └─...					组件
│
└─...						其他页面
```
