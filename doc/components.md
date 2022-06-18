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
class MyCounter extends CydonElement {
	constructor() {
		super();
		this.data.value = this.getAttribute('value') || 0
		this.bind()
	}
	increase() {
		this.value++
	}
	decrease() {
		this.value--
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
	}
}
```
my-counter.emt

最简写法:
```styl
{$value}
btn[@click=increase]{+1}
btn[@click=decrease]{-1}
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
			btn[@click=increase]{+1}
		slot[n=decrease]
			btn[@click=decrease]{-1}
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
	btn[@click=decrease slot=decrease]{decrease}
```