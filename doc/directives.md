# 指令

## 内置指令

| 指令         | 说明                       |
| ------------ | -------------------------- |
| c-model      | 双向绑定（实时更新）       |
| c-model.lazy | 双向绑定（非实时更新）     |
| :*attr*      | 属性绑定                   |
| @*event*     | 事件绑定                   |
| @$*event*    | 动态事件名称绑定           |
| c-cloak      | 该属性在组件初始化后被移除 |

e.g.
```styl
button[@click="alert('Hello world')"]{Click me}
```

## 扩展指令

| 指令  | 说明        |
| ----- | ----------- |
| ref   | DOM节点引用 |
| $attr | 动态属性名  |

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

e.g.

`to-remove`：带有该属性的元素将在页面加载完成时被自动删除
```js
directives.push(({ name, ownerElement: el }) => {
	if (name == 'to-remove') {
		addEventListener('load', () => el.remove())
		return true
	}
})
```

### 局部指令
Cydon并没有没有特定的局部指令写法，这里给出两种注册方式：
1. 原生方法
	```js
	class CustomElement extends HTMLElement {
		constructor() {
			super()
			const attr = this.getAttribute('attr')
			if (attr != null) {
				//...
			}
		}
	}
	```
2. 注册全局指令时添加限定条件
	```js
	directives.push(({ name, value, ownerElement: el }) => {
		if (el.tagName == 'CUSTOM-ELEMENT' && name == 'attr') {
			//...
		}
	})
	```