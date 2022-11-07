# 组件

## Import
```ts
import { customElement, CydonElement } from 'cydon'
```

## 基本组件
e.g.
```ts
import { bind, customElement } from 'cydon'

@customElement('custom-element')
class CustomElement extends HTMLElement {
	canvas = this.appendChild(document.createElement('canvas'))
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
import { bind, customElement } from 'cydon'

@customElement('my-counter')
export class MyCounter extends CydonElement {
	value = +this.getAttribute('value')!

	constructor() {
		super()
		bind(this)
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
button[@click=inc]{+1}
button[@click=dec]{-1}
```

最简写法:
```styl
{$value}
button[@click=value++]{+1}
button[@click=value--]{-1}
```

带上样式和Shadow DOM（假设使用了`vite-plugin-ustyle`插件）:
```styl
template[shadowroot=open]
	style{
		button
			@apply px-3
		@unocss-placeholder
	}
	.flex.items-center
		{$value}
		slot[name=increase]
			button[@click=inc]{+1}
		slot[name=decrease]
			button[@click=dec]{-1}
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
	button[@click=dec slot=decrease]{decrease}
```

### 说明
1. 构造函数中别忘了调用`this.bind()`，这样才能实现数据的单向绑定
2. `inc()`和`dec()`中的`this`其实是一个Proxy对象，因此所有对`this`所作的更改将会反映到DOM中