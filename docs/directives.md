# 指令

## 注意
注册的指令数量越多，编译速度越慢，推荐按需注册自定义指令

## 内置指令

注意：所有内置指令均不支持插值（动态属性值），例如`ref="$name"`表示将原始 DOM 元素对象保存到`$data.$name`上，`$name`不会被替换为`name`的值

### c-show
基于表达式值的真假性，来改变元素的可见性

**期望的绑定值类型：**`any`

`c-show`通过设置内联样式的 `display` CSS 属性来工作，当元素可见时将使用初始 `display` 值

### c-if
基于表达式值的真假性，来条件性地渲染元素

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

### ref
将该元素的原始 DOM 对象保存到`$data`的由指定属性上，属性名为`ref`的属性值，相同属性会覆盖

### c-for
基于原始数据多次渲染子组件，只能用于`<template>`，**该指令存在时会忽略其他指令**

**期望的绑定值类型：**`object[]`

采用就地更新策略

示例：`c-for="item, index; items"`，其中`index`可省略

当没有传入参数时，跳过该元素及其所有子元素的编译，所有模板语法都会被保留并按原样渲染

### c-tp
将内部元素传送到目标元素中，只能用于`<template>`

值可以是类型为DOM元素对象的属性的名称或CSS选择器字符串

若值为空或指定的对象属性的值为空，则禁用传送，内部元素会渲染在原地

### @*event*
给元素绑定事件监听器

**期望的绑定值类型：**`Function | Inline Statement`

#### 修饰符
- `.away`：只有事件从元素外触发才执行处理函数，该元素必须可包含子元素
- `.capture`：在捕获模式添加事件监听器
- `.once`：最多触发一次处理函数
- `.passive`：通过 `{ passive: true }` 附加一个 DOM 事件

支持多个修饰符同时使用

### @$*event*
动态事件名称绑定，与@*event*类似

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

### $*attr*
动态属性名

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

当返回的对象不存在`deps`属性时：
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

当返回的对象存在`deps`属性时：
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