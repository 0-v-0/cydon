# Cydon
Lightweight Frontend Framework

# Usage
```html
<div class="card">$msg</div>
<div class="$css_class">$msg</div>
```

```ts
import { Cydon } from "cydon";
let app = new Cydon({
	msg: 'Hello world',
	css_class: 'bold red'
});
app.bind(document.body);
let { data } = app;
data.msg = 'foo';
data.css_class = 'bar';
```
