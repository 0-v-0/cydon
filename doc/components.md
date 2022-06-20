# 组件

## Import
```ts
import { customElement, CydonElement } from 'cydon'
```

## 基本组件
e.g.
```ts
@customElement('custom-element')
class CustomElement extends HTMLElement {
	canvas
	constructor() {
		super()
		this.canvas = document.createElement('canvas')
		this.appendChild(this.canvas)
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'custom-element': CustomElement
	}
}
```

## 响应式组件
以实现一个简单的计数器为例，点击`+1`按钮值增加1，点击`-1`按钮值减少1，可设置初始值，支持自定义按钮

定义组件

my-counter.ts
```ts
@customElement('my-counter')
export class MyCounter extends CydonElement {
	value = +this.getAttribute('value')!

	constructor() {
		super()
		this.bind()
	}

	inc() { this.value++ }
	dec() { this.value-- }
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
	}
}
```
my-counter.emt

一般写法:
```styl
{$value}
btn[@click=inc]{+1}
btn[@click=dec]{-1}
```

最简写法:
```styl
{$value}
btn[@click=value++]{+1}
btn[@click=value--]{-1}
```

带上样式和Shadow DOM（假设使用了`@cydon/ustyle`插件）:
```styl
template[shadowroot=open]
	style{
		button
			@apply px-3
		@unocss-placeholder
	}
	.flex.items-center
		{$value}
		slot[n=increase]
			btn[@click=inc]{+1}
		slot[n=decrease]
			btn[@click=dec]{-1}
```

使用组件
```styl
my-counter
```
设置初始值
```styl
my-counter[value=1]
```
自定义`-1`按钮
```styl
my-counter[value=1]
	btn[@click=dec slot=decrease]{decrease}
```

### 说明
1. 示例中用到的标签和属性缩写 `btn`: `button`, `n`: `name`
2. 构造函数中别忘了调用`this.bind()`，这样才能实现数据的单向绑定
3. `inc()`和`dec()`中的`this`其实是一个Proxy对象，因此所有对`this`所作的更改将会反映到DOM中