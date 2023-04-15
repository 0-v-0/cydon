# Definition

## 定义Web Component
To define a web component use the `define` decorator from the library:

```ts
define(tagName: string, options?: ElementDefinitionOptions): ClassDecorator
```

用法
```ts
import { define } from 'cydon'

@define('custom-element')
class CustomElement extends HTMLElement { /* … */ }
```

若你使用JavaScript或者不使用decorator写法，则使用原生写法：
```js
class CustomElement extends HTMLElement { /* … */ }
customElements.define('custom-element', CustomElement)
```

若需要TypeScript类型检查，还需要添加以下内容
```ts
declare global {
	interface HTMLElementTagNameMap {
		'custom-element': CustomElement
	}
}
```

## 响应式组件
以实现一个简单的计数器为例，点击`+1`按钮值增加1，点击`-1`按钮值减少1，可设置初始值

### 定义组件
my-counter.ts
```ts
import { define, CydonElement } from 'cydon'

@define('my-counter')
class MyCounter extends CydonElement {
	value = +this.getAttribute('value')!
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
	}
}
```
my-counter.emt
```stylus
{$value}
button[@click=value++]{+1}
button[@click=value--]{-1}
```

这里的`CydonElement`就是`CydonOf(HTMLElement)`

## 使用组件
```stylus
my-counter
```
设置初始值
```stylus
my-counter[value=1]
```

## 导入组件
若需要使用该组件，但不引入符号，直接引入即可：
```ts
import './my-counter'
```

若需要在外部使用`MyCounter`，在class前加上export关键字即可

my-counter.ts:
```ts
@define('my-counter')
export class MyCounter extends CydonElement { /* … */ }
```
导入：
```ts
import { MyCounter } from './my-counter'
```

也可以使用默认导出

my-counter.ts:
```ts
@define('my-counter')
export default class MyCounter extends CydonElement { /* … */ }
```
```ts
import MyCounter from './my-counter'
```

## 局部样式
利用原生Shadow DOM实现样式隔离
```stylus
template[shadowroot=open]
  style{
    /* … */
  }
  /* … */
```
## 插槽
插槽属于原生Web Components，不是框架的一部分

my-counter.emt
```stylus
template[shadowroot=open]
		{$value}
		slot[name=increase]
			button[@click=value++]{+1}
		slot[name=decrease]
			button[@click=value--]{-1}
```