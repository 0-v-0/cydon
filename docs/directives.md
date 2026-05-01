# 指令

## 注意

注册的指令数量越多，编译速度越慢，推荐按需注册自定义指令

## 内置指令

注意：所有内置指令均不支持插值（动态属性值），例如`ref="$name"`表示将原始 DOM 元素对象保存到`$data.$name`上，`$name`不会被替换为`name`的值

### c-show

基于表达式值的真假性，来改变元素的可见性

**期望的绑定值类型：**`any`

`c-show`通过设置内联样式的 `display` CSS 属性来工作，当元素可见时将使用初始 `display` 值

```html
<p c-show="visible">Hello</p>
```

当`visible`为假值时，元素将被设置为`display: none`；当`visible`为真值时，恢复为初始的`display`值

### c-if

基于表达式值的真假性，来条件性地渲染元素。与`c-show`不同，`c-if`会真正地添加或移除DOM元素

**期望的绑定值类型：**`any`

- 当值为真时：元素被插入DOM，并调用`mount`方法
- 当值为假时：元素被替换为注释节点，并调用`unmount`方法

```html
<p c-if="show">条件内容</p>
```

> `c-if`有更高的切换开销（需要创建/销毁DOM），而`c-show`有更高的初始渲染开销。如果需要频繁切换，优先使用`c-show`

### c-model

在表单输入元素上创建双向绑定

支持的元素：
- `<input>`
- `<select>`
- `<textarea>`
- components

当绑定的变量类型为`number`时，赋值时将自动转换为`number`类型

修饰符：`.lazy` ——监听`change`事件而不是`input`，对于`<select>`、`input type=radio`和`input type=checkbox`来说总是监听`change`事件，因此无需这个修饰符

注意在`<textarea>`中是不支持插值表达式的，请使用`.value`或`c-model`来替代

**不同表单元素的行为：**

| 元素类型/属性 | 绑定值 | 事件（无`.lazy`时） | 说明 |
| --- | --- | --- | --- |
| `input type=text` | `value` | `input` | 文本输入 |
| `input type=radio` | `checked`（值匹配时） | `change` | 当`value`属性等于绑定值时选中 |
| `input type=checkbox` | `checked` | `change` | 布尔值绑定 |
| `select` (单选) | `value` | `change` | 下拉选择 |
| `select` (多选) | `selectedOptions`数组 | `change` | 多选时绑定值为数组 |
| `textarea` | `value` | `input` | 文本域 |

**输入法组合：**`c-model`会自动处理IME输入法组合状态，在组合输入期间不会触发更新，只有组合完成后才更新数据

示例：

```html
<input c-model="msg" placeholder="输入文本">
<p>$msg</p>

<input type="checkbox" c-model="checked">

<select c-model="selected">
    <option value="a">A</option>
    <option value="b">B</option>
</select>

<select c-model="selectedItems" multiple>
    <option value="a">A</option>
    <option value="b">B</option>
</select>
```

### ref

将该元素的原始 DOM 对象保存到`$data`的由指定属性上，属性名为`ref`的属性值，相同属性会覆盖

```html
<input ref="inputEl">
<button @click="inputEl.focus()">聚焦</button>
```

### c-for

基于原始数据多次渲染子组件，只能用于`<template>`，**该指令存在时会忽略其他指令**

**期望的绑定值类型：**`object[]`

示例：`c-for="item, index; items"`，其中`index`可省略

当没有传入参数时，跳过该元素及其所有子元素的编译，所有模板语法都会被保留并按原样渲染

**更新策略：**

当数据变化时，采用就地更新策略

当数组项为对象时，Cydon会复用已有的DOM元素，仅更新变化的数据属性，而不是重新创建DOM。当数组项为原始值时，直接赋值并触发更新

当数组长度变化时，Cydon会自动增减DOM元素：
- 增加元素时：创建新的DocumentFragment并绑定
- 减少元素时：移除多余的DOM节点，并通过`requestIdleCallback`在空闲时清理未连接的绑定

```html
<ul>
    <template c-for="item, index; list">
        <li>${index}: ${item.name}</li>
    </template>
</ul>
```

### c-tp

将内部元素传送到目标元素中，只能用于`<template>`

值可以是类型为DOM元素对象的属性的名称或CSS选择器字符串

若值为空或指定的对象属性的值为空，则禁用传送，内部元素会渲染在原地

示例：

```html
<template c-tp="body">
    <div>此元素将传送到body</div>
</template>

<template c-tp="targetEl">
    <div>此元素将传送到data.targetEl指向的元素</div>
</template>

<template c-tp="">
    <div>此元素将渲染在原地</div>
</template>
```

### @*event*

给元素绑定事件监听器

**期望的绑定值类型：**`Function | Inline Statement`

属性值可以为方法名或内联表达式。若数据对象中存在对应方法名，则调用该方法；否则视为内联表达式执行

内联表达式中`$e`指向Event对象，表达式将在`with(this)`上下文中执行

**事件委托：**对于非`capture`、非`once`且非`$`动态事件，Cydon会将事件监听器委托到根节点（Document或ShadowRoot），通过事件冒泡机制触发，以减少事件监听器的数量

#### 修饰符

- `.away`：只有事件从元素外触发才执行处理函数，该元素必须可包含子元素
- `.capture`：在捕获模式添加事件监听器，使用捕获模式时不会进行事件委托
- `.once`：最多触发一次处理函数，使用`once`时不会进行事件委托
- `.passive`：通过 `{ passive: true }` 附加一个 DOM 事件

支持多个修饰符同时使用，例如：`@click.capture.once`

```html
<button @click="count++">+1</button>
<button @click.prevent="submit">提交</button>
<div @click.away="close">点击外部关闭</div>
```

### @$*event*

动态事件名称绑定，与@*event*类似。事件名从数据对象中动态获取，但只在绑定时计算一次

```html
<button @$evt="handler">动态事件</button>
```

```ts
// data
{ evt: 'click', handler() { /* ... */ } }
```

### :

用于执行内联响应式语句，在组件初始化时执行一次并追踪依赖，并依赖项更改时重新执行，类似[petite-vue](https://github.com/vuejs/petite-vue)中的`v-effect`

**e.g.** 实现与`<p c-text="msg"></p>`等效的功能：

```html
<p :="$e.textContent = msg"></p>
```

### :*attr*

条件属性绑定，一般只用于class属性，可根据条件动态绑定多个类名

以`:class="a: cond1; b: cond2"`为例：
- 当`cond1`,`cond2`为真：`class="a b"`
- 当`cond1`为真：`class="a"`
- 当`cond2`为真：`class="b"`
- 当`cond1`,`cond2`为假：`class=""`

### .*prop*

DOM对象属性绑定，属性值为一个表达式，表达式的值将会赋值给对应属性

**e.g.**

```html
<option .selected="count == input.value" value="$count">$count</option>
```

### c-cloak

用于隐藏尚未初始化的 DOM 元素，该属性在组件初始化后被移除

通常配合CSS使用：

```css
[c-cloak] { display: none }
```

### $*attr*

动态属性名，属性名从数据对象中获取

```html
<button $attr="value">动态属性</button>
```

## 自定义指令

### 全局指令

所有全局指令处理函数均在`directives`数组中

```js
import { directives } from 'cydon'
```

全局指令有两种注册方式：

1. 在内置指令之前插入（可改变内置指令行为）：

```js
directives.unshift(handler)
```

2. 在内置指令之后插入（不能改变内置指令行为）：

```js
directives.push(handler)
```

其中`handler`为指令处理函数，当函数返回真会跳过执行`directives`中后续的指令处理函数并从DOM中**删除**该属性

若需保留该属性，在返回的对象加上`keep: true`即可

**DirectiveHandler函数签名：**

```ts
type DirectiveHandler = (
    name: string,       // 属性名
    value: string,      // 属性值
    el: Element,        // 目标元素
    attrs: AttrMap,     // 当前元素已绑定的属性映射
    parent?: ParentNode // 父节点（仅在c-for中存在）
) => Directive | void
```

当返回的对象不存在`deps`属性时（一次性指令）：

```js
directives.push((name, value, el, attrs, parent) => {
  // 模板编译时执行
  // …
  return {
    f(el) {
      // 绑定元素时执行，这里this指向cydon实例的data对象
    }
  }
})
```

当返回的对象存在`deps`属性时（响应式指令）：

```js
directives.push((name, value, el, attrs, parent) => {
	// 模板编译时执行
	// …

	// 允许在一个指令处理函数中注册多个Target
	attrs.set(Symbol('xxx'), {
		f(el) {
			// 绑定元素时执行，执行顺序优先于下面的f函数
		}
	})

	return {
		deps: new Set // 关联的依赖项
		f(el) {
			// 绑定元素或关联的依赖项更新时执行，这里this指向cydon实例的data对象
		}
	}
})
```

### 局部指令

每个cydon实例的`$directives`字段表示局部指令处理函数列表，该字段默认值为全局指令列表

```js
this.$directives.push((name, value, el) => {
	if (name == 'attr') {
		//...
	}
})
```

以上例子直接修改了该字段，会影响全局指令列表，若需要保留全局指令的同时不影响全局指令列表，应该使用浅拷贝，如下所示

```js
import { directives } from 'cydon'
//...
this.$directives = [(name, value, el) => {
	if (name == 'attr') {
		//...
	}
}, ...directives]
```

## 自定义指令示例

### to-remove

带有该属性的元素将在页面加载完成时被自动删除

```js
directives.push((name, value, el) => {
	if (name == 'to-remove')
		return {
			f(el) {
				addEventListener('load', () => el.remove())
			}
		}
})
```

### c-text

将元素的文本内容响应式更新为指定表达式结果的字符串表示

```ts
(name, value): Directive | void => {
	if (name == 'c-text') {
		const func = toFunction('return ' + value)
		return {
			deps: new Set,
			f(el) {
				el.textContent = func.call(this, el)
			}
		}
	}
}
```