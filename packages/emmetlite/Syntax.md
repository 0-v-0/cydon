# 语法
[English version](#Syntax)
## [基本语法](https://docs.emmet.io/abbreviations/syntax)
- 默认元素
- **.** : 类                                        ex: `.block`    => `<div class="block"></div>`
- **#** : id                                       ex: `#t_01`     => `<div id="t_01"></div>`
- **>** : 子元素                                    ex: `div>span`     => `<div><span></span></div>`
- **+** : 兄弟节点                                  ex: `div+span`     => `<div></div><span></span>`
- **^** : 节点爬升                                  ex: `div>a^span`   => `<div><a></a></div><span></span>`
- **[]** : 属性                                     ex: `input[type=checkbox checked]` => `<input type="checkbox" checked>`
- **{}** : 内容                                     ex: `div{text}` or `div>{text}` => `<div>text</div>`
- __*__ : 数量                                      ex: `ol>li*3`      => `<ol><li></li><li></li><li></li></ol>`
- **()** : 分组                                     ex: `table>(tr>td)*3` => `<table><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr></table>`
- **$** : 数量语法糖                                 ex: `div#t_$$*3`   => `<div id="t_01"></div><div id="t_02"></div><div id="t_03"></div>`
- **@** : 数量起始位置和递减选项                       ex: `span{$@-5}*3` => `<span>5</span><span>4</span><span>3</span>`
ex:
`<.>` => `<div></div>`
`#x{a}b{b}^{c}a{<%name%>}` => `<div id="x">a</div><b>b</b>c<a><%name%></a>`

与官方语法区别：
---
1. 属性以空格间隔，不支持一个标签带多个[]
ex: `tag#id.classes.separated.by.dots.and[attributes="sepearated by" spaces]` => `<tag class="classes separated by dots and" id="id" attributes="sepearated by" spaces></tag>`
`a[href=#][data-b=b]` => `<a href="#][data-b=b"></a>`
2. 不支持HTML标签： `<h1>1</h1>` => `<h1><h1></h1></h1>`
3. 没有`*`操作时会保留'$'： `(ul>.t${$})(ul>.t${$})*1` => `<ul><li class="t$">$</li></ul><ul><li class="t0">0</li></ul>`
4. `*` 可放在末尾作为注释使用：`a*` => ``
5. !DOCTYPE 缩写：`!` => `<!DOCTYPE html>`
6. `.`可用于代替不在`{`前的隐式标签名
ex:
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
=>
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
7. 后置标签名和标签名替换：
- `[href=#]a` => `<a href="#"></a>`
- `b[href=#]a` => `<a href="#"></a>`
- `[href=#]b a` => `<a href="#"></a>`
- `[href=#t$]a*1 b+s+a*` => `<a href="#t0"></a><s></s>`

## 扩展语法
1. 行尾的`}`和`)`和同级标签间的`+`可省略（不推荐），但`]`和`[`之间的`+`不可省略
2. 支持属性中包含`[`和`]`（不成对的括号可能会出问题，尝试分离模板和内容并配合模板引擎来解决），ex:
	- `a[data-a=[[] data-b=[]]]{foo{1}}b[data-a=[] data-b=[]]{bar{2}` => `<a data-a="[[]" data-b="[]]">foo{1}</a><b data-a="[]" data-b="[]">bar{2</b>`
	- `a[data-a=[ data-b=]]+b[data-a=] data-b=[]` => `<a data-a="[" data-b="]"></a><b data-a="]" data-b="["></b>`
3. 支持多行注释(`{ ... }*`)与单行注释（不包含+>^，位于行首，以空格结束）
以下是错误写法：  
`Not a comment` => `<comment></comment>`  
`Not a comment.` => `<comment></comment>`  
`Not a comment.1` => `<comment class="1"></comment>`
4. 不包含空格的属性值可省略引号，会自动添加双引号，单引号会被保留
ex: `A comment img[src='1.webp' alt="foo bar" width=300](hr` => `<img src='1.webp' alt="foo bar" width="300"><hr>`
5. `a>(b)`中可省略'>'：`a(b)` => `<a><b></b></a>`
6. 支持自定义默认元素、自定义标签名缩写、自定义属性缩写、自定义扩展属性
# Syntax
## [Basic Syntax](https://docs.emmet.io/abbreviations/syntax)
- default elements
- **.** : class setter                             ex: `.block`    => `<div class="block"></div>`
- **#** : id setter                                ex: `#t_01`     => `<div id="t_01"></div>`
- **>** : child setter                             ex: `div>span`     => `<div><span></span></div>`
- **+** : sibling setter                           ex: `div+span`     => `<div></div><span></span>`
- **^** : parent setter                            ex: `div>a^span`   => `<div><a></a></div><span></span>`
- **[]** : attribute setter                        ex: `input[type=checkbox checked]` => `<input type="checkbox" checked>`
- **{}** : plain text node                         ex: `div{text}` or `div>{text}` => `<div>text</div>`
- __*__ : repeat for n times                       ex: `ol>li*3`      => `<ol><li></li><li></li><li></li></ol>`
- **()** : group tags, use with *                  ex: `table>(tr>td)*3` => `<table><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr></table>`
- **$** : auto increase number                     ex: `div#t_$$*3`   => `<div id="t_01"></div><div id="t_02"></div><div id="t_03"></div>`
- **@** : auto increase number option, use with $  ex: `span{$@-5}*3` => `<span>5</span><span>4</span><span>3</span>`

Different from official syntax
---
1. Attributes sepearated by spaces, multiple '[...]' in a tag are not supported.
ex: `tag#id.classes.separated.by.dots.and[attributes="sepearated by" spaces]` => `<tag class="classes separated by dots and" id="id" attributes="sepearated by" spaces></tag>`  
`a[href=#][data-b=b]` => `<a href="#][data-b=b"></a>`
2. HTML tags not supported: `<h1>1</h1>` => `<h1><h1></h1></h1>`
3. `(ul>.t$)(ul>.t$)*` => `<ul><li class="t$"></li></ul><ul><li class="t0"></li></ul>`
4. `*` is regarded as comment: `a*` => ``
5. !DOCTYPE abbreviation: `!` => `<!DOCTYPE html>`
6. `.` can replace default elements not before `{`
ex:
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
=>
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
7. post-tagname and tagname replacement:
- `[href=#]a` => `<a href="#"></a>`
- `b[href=#]a` => `<a href="#"></a>`
- `[href=#]b a` => `<a href="#"></a>`
- `[href=#t$]a*1 b+s+a*0` => `<a href="#t0"></a><s></s>`

## Additional Syntax
1. '}',')' in the end of line and '+' between siblings can be omitted (deprecated), but '+' between ']' and '[' can't be omitted.
2. Supported '[' and ']' in attribute (unpaired brackets may go wrong. To solve the problem, try separating template from content and use a template engine), ex:
	- `a[data-a=[[] data-b=[]]]{foo{1}}b[data-a=[] data-b=[]]{bar{2}` => `<a data-a="[[]" data-b="[]]">foo{1}</a><b data-a="[]" data-b="[]">bar{2</b>`
	- `a[data-a=[ data-b=]]+b[data-a=] data-b=[]` => `<a data-a="[" data-b="]"></a><b data-a="]" data-b="["></b>`
3. Supported multiline comment (`{ ... }*`) and single-line comment (not contain '+','>' and '^', at the beginning of the line and ends with a space)
4. Attribute values without spaces can omit quotation marks, " will be added automatically, and ' will be reserved
ex: `Implicit comment img[src='1.webp' alt="foo bar" width=300](hr` => `<img src='1.webp' alt="foo bar" width="300"><hr>`
5. `a(b)` => `<a><b></b></a>`
6. Supported custom default elements, custom tagname abbreviations, custom attribute abbreviations and custom extended attributes
