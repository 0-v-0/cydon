# Cydon
Lightweight Frontend Framework

## 特点
- 简单易用
- 轻量小巧
- 模块间低耦合，大部分模块可单独使用

# Requirements
Node 17.5+

# Usage
```html
<div class="card">$msg</div>
<div class="$css_class">$msg</div>
```

```ts
import { Cydon } from 'cydon';
let app = new Cydon({
	msg: 'Hello world',
	css_class: 'bold red'
});
app.bind(document.body);
let { data } = app;
data.msg = 'foo';
data.css_class = 'bar';
```
