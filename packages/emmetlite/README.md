# emmetlite

Emmet implementation in javascript
一个轻量级的emmet实现

# Features
- Full Emmet syntax support.
- Added extension syntax, Supported custom default elements, custom tagname abbreviations, custom attribute abbreviations and custom extended attributes (through `fabbr` and `aabbr` parameters).
- contains only string operations and no DOM operations, so it has excellent performance and can be loaded asynchronously.
- only 2.33KB (gzipped)

# 特性
- 完整的emmet语法支持
- 添加了扩展语法，支持自定义默认元素、自定义标签名缩写、自定义属性缩写、自定义扩展属性（通过`fabbr`和`aabbr`参数）
- 仅含字符串操作，不含任何DOM操作，因此拥有极好的性能，可异步加载
- 仅 2.31KB (gzip)

# 安装 Installation
```js
import Emmet from './emmetLite.min.js'
```

# 语法 Syntax
[here](./Syntax.md)

# 用法 Usage
```js
string Emmet(string s, [string indent = null], [function fabbr = (default function)])
```
Parameters:
- `s`: emmet string
- `indent`: If null, use the original emmet format. Otherwise, use the indented format with `indent` as a indent unit.
- `fabbr`: Custom abbreviation function.
参数：
- `s`: emmet字符串
- `indent`: 为空使用原始emmet格式，否则使用以`indent`为缩进单位的缩进格式
- `fabbr`: 自定义缩写函数
ex:
```js
Emmet(".a>p") //<div class="a"><p></p></div>
Emmet(`!
html
  head
    link:favicon
  .
    h1{Hello world!}
`,'  ')
//<!DOCTYPE html><html><head><link rel="shortcut icon" type="image/x-icon" href="favicon.ico"></head><body><h1>Hello world!</h1></body></html>
```
