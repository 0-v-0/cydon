# 组件生命周期
Cydon是基于Web Components的，组件生命周期均遵循Web Components规范

- `constructor`：组件创建时执行，在整个生命周期中只会执行一次
- `attributeChangedCallback(name, oldVal, newVal)`：被监听的属性发生变化时执行，该函数先于`connectedCallback`执行
  - `name`：属性名
  - `oldVal`：旧属性值，首次调用该函数或该属性为新增属性时为null
  - `newVal`：新属性值，该属性被删除时为null
- `connectedCallback()`：当组件被添加到文档中时执行
- `disconnectedCallback()`：当组件从文档中删除时执行
- `adoptedCallback()`：当组件被移动到新文档时执行

当组件移动到其他文档中的时的执行顺序依次为：`disconnectedCallback`→`adoptedCallback`→`connectedCallback`

## 注意
Cydon组件初始化在`connectedCallback`阶段执行，该阶段在`attributeChangedCallback`之后，若属性值中包含插值表达式，首次调用`attributeChangedCallback`时`newVal`参数为未渲染的属性值，`oldVal`为null

也可以提前调用`this.mount()`（不推荐），此时需要重载`connectedCallback`以防止调用`super.connectedCallback`导致重复绑定

## 参考
[Custom elements (javascript.info)](https://javascript.info/custom-elements#rendering-order)

# 组件间通信

## 通过eventHub通信
该方法适用于任何组件（对于原生的Web Components也适用）

```ts
import { EventOf } from 'cydon'
const eventHub = new EventOf()

@define('comp-a')
export class CompA extends CydonElement {
    count = 0

    add() {
        count++
        eventHub.emit('countChanged', count)
    }
}

@define('comp-b')
export class CompB extends CydonElement {
    countChanged(count: number) {
        console.log('count: ' + count)
    }

    connectedCallback() {
        eventHub.on('countChanged', this.countChanged)
        super.connectedCallback()
    }

    disconnectedCallback() {
        eventHub.off('countChanged', this.countChanged)
    }
}
```

## 父组件向子组件传递数据
1. 通过事件传递
2. 通过props传递
	```stylus
	x-parent
		x-children[.prop=x]
	```
3. 通过DOM属性传递
	```stylus
	x-parent
		x-children[attr=x]
	```

## 子组件向父组件传递数据
1. 通过事件传递
2. 通过对象属性或方法传递：直接访问父组件DOM对象的属性或方法