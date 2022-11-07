# Cydon
A lightweight library for building fast, reactive web components.

## 特点
- 简单易用
- 轻量小巧
- 模块间低耦合，大部分模块可单独使用

# Usage
```html
<div class="card">$msg</div>
<div class="$css_class">$msg</div>
```

```ts
import { Cydon } from 'cydon'

const app = new Cydon({
	data: {
		msg: 'Hello world',
		css_class: 'bold red'
	}
})
app.bind(document.body)
let { data } = app
data.msg = 'foo'
data.css_class = 'bar'
```
