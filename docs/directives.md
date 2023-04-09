# 指令

## 内置指令

注意：所有内置指令均不支持动态属性值

### c-show
基于表达式值的真假性，来改变元素的可见性

**期望的绑定值类型：**`any`

`c-show`通过设置内联样式的 `display` CSS 属性来工作，当元素可见时将使用初始 `display` 值

### c-model
在表单输入元素上创建双向绑定

支持的元素：
- `<input>`
- `<select>`
- `<textarea>`
- components

修饰符：`.lazy` ——监听`change`事件而不是`input`

### ref
获取原始 DOM 元素，并将对象保存到`$data`上

### c-for
基于原始数据多次渲染子组件，只能用于template元素

**期望的绑定值类型：**`object[]`

采用就地更新策略

示例：`c-for="item, index; items"`，其中`index`可省略

当没有传入参数时，跳过该元素及其所有子元素的编译，所有模板语法都会被保留并按原样渲染

### @*event*
给元素绑定事件监听器

**期望的绑定值类型：**`Function | Inline Statement`

## 修饰符：
- `.away`： 只有事件从元素外发出才触发处理函数
- `.capture`： 在捕获模式添加事件监听器
- `.once`： 最多触发一次处理函数
- `.passive` - 通过 { passive: true } 附加一个 DOM 事件

### @$*event*
动态事件名称绑定，与@*event*类似

### :
组件初始化和更新时执行的代码

### :*attr*
属性绑定，一般只用于class

示例：`:class="a: cond1; b: cond2"`
- 当`cond1`,`cond2`为真：`class="a b"`
- 当`cond1`为真：`class="a"`
- 当`cond2`为真：`class="b"`
- 当`cond1`,`cond2`为假：`class=""`

### .*prop*
DOM对象属性绑定

### c-cloak
用于隐藏尚未完成编译的 DOM 模板，该属性在组件初始化后被移除

### $*attr*
动态属性名

## 自定义指令
### 全局指令

全局指令处理函数保存在`directives`中
```js
import { directives } from 'cydon'
```

全局指令有两种注册方式：
1. 在内置指令之前插入（可改变内置指令行为）：
	```js
	directives.unshift(func)
	```
2. 在内置指令之后插入（不能改变内置指令行为）：
	```js
	directives.push(func)
	```

其中func是一个接受参数类型为`DOMAttr`的指令处理函数，返回真会跳过执行`directives`中后续的指令处理函数并**删除**该属性

### 局部指令
每个cydon实例都有一个`directives`字段，默认值为全局的`directives`，通过修改它可以实现局部指令
```js
this.directives.push(({ name, value, ownerElement: el }) => {
	if (name == 'attr') {
		//...
	}
})
```

## 自定义指令示例

### to-remove
带有该属性的元素将在页面加载完成时被自动删除
```js
directives.push(({ name, ownerElement: el }) => {
	if (name == 'to-remove')
		return {
			f(el) {
				addEventListener('load', () => el.remove())
			}
		}
})
```

### c-text
更新元素的文本内容
```ts
({ name, value }): Directive | void => {
	if (name == 'c-text') {
		const func = getFunc('return ' + value)
		return {
			deps: new Set,
			f(el) {
				(<DOM>el).textContent = func.call(this, el)
			}
		}
	}
}
```