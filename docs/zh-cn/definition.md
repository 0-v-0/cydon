# 定义

## 定义Web Component

在TypeScript中，使用`define`装饰器定义Web Component

```ts
define(tagName: string, options?: ElementDefinitionOptions): ClassDecorator
```

参数：
- `tagName`：自定义元素标签名，必须包含连字符（如`my-component`）
- `options`：传递给`customElements.define`的选项，如`{ extends: 'p' }`用于自定义内置元素

用法

```ts
import { define } from 'cydon'

@define('my-element')
class MyElement extends HTMLElement {
    /* … */
}
```

若你使用JavaScript或者不使用decorator写法，则使用原生写法：

```js
class MyElement extends HTMLElement {
    /* … */
}
customElements.define('my-element', MyElement)
```

若需要TypeScript类型检查，还需要添加以下内容

```ts
declare global {
	interface HTMLElementTagNameMap {
		'my-element': MyElement
	}
}
```

## 响应式组件

以实现一个简单的计数器为例，点击`+1`按钮值增加1，点击`-1`按钮值减少1，可通过`value`属性设置初始值

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

### Cydon vs CydonElement

| 类 | 基类 | 用途 |
| --- | --- | --- |
| `Cydon` | `Object` | 非Web Component场景，如独立脚本 |
| `CydonElement` | `HTMLElement` | Web Component场景，自动在`connectedCallback`中挂载 |

`CydonElement`在`connectedCallback`中自动调用`mount()`方法，因此不需要手动挂载。

### 自定义基类

可以使用`CydonOf`创建基于其他基类的响应式类：

```ts
import { CydonOf } from 'cydon'

// 基于另一个自定义元素
const MyBaseElement = CydonOf(SomeOtherElement)

@define('my-element')
class MyElement extends MyBaseElement {
  /* … */
}
```

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
export class MyCounter extends CydonElement {
  /* … */
}
```

导入：

```ts
import { MyCounter } from './my-counter'
```

也可以使用默认导出

my-counter.ts:

```ts
@define('my-counter')
export default class MyCounter extends CydonElement {
  /* … */
}
```

```ts
import MyCounter from './my-counter'
```

## 属性监听

若需要监听HTML属性的变化，需要定义静态的`observedAttributes`数组，并在`attributeChangedCallback`中处理：

```ts
@define('my-input')
class MyInput extends CydonElement {
  static observedAttributes = ['value']

  value = ''

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name == 'value') {
      this.data.value = newVal
    }
  }
}
```

> **注意**：Cydon组件初始化在`connectedCallback`阶段执行，该阶段在`attributeChangedCallback`之后。若属性值中包含插值表达式，首次调用`attributeChangedCallback`时`newVal`参数为未渲染的属性值，`oldVal`为null

## 局部样式

利用原生Shadow DOM实现样式隔离

```stylus
template[shadowrootmode=open]
  style{
    /* … */
  }
  /* … */
```

## 插槽

插槽属于原生Web Components，不是框架的一部分

my-counter.emt

```stylus
template[shadowrootmode=open]
		{$value}
		slot[name=increase]
			button[@click=value++]{+1}
		slot[name=decrease]
			button[@click=value--]{-1}
```

使用时可以通过插槽自定义按钮内容：

```stylus
my-counter
  button[slot=increase]{增加}
  button[slot=decrease]{减少}
```