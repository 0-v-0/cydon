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

## 生命周期流程

```
创建实例 → constructor
           ↓
添加到DOM → attributeChangedCallback (若属性有初始值)
           ↓
         connectedCallback
           ↓
         mount() → compile → bind (自动执行)
           ↓
         组件运行中...
           ↓
从DOM移除 → disconnectedCallback
```

## 注意

### attributeChangedCallback注意事项
Cydon组件初始化在`connectedCallback`阶段执行，该阶段在`attributeChangedCallback`之后，若属性值中包含插值表达式，首次调用`attributeChangedCallback`时`newVal`参数为未渲染的属性值，`oldVal`为null

### mount注意事项
不能在`constructor`中调用`this.mount()`，因为此时子元素的DOM可能未加载完成，会导致子元素未绑定到响应式数据。`mount()`必须在子元素DOM加载完成后（如`connectedCallback`触发后）调用

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
        this.count++
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

> **提示**：在`connectedCallback`中注册事件监听，在`disconnectedCallback`中移除，可以避免内存泄漏

## 父组件向子组件传递数据

1. **通过事件传递**：父组件通过`emit`发送事件，子组件通过`on`监听，可传递任意类型的参数

2. **通过props传递**：在EMT模板中通过属性绑定传递，可传递任意类型的参数

   ```stylus
   x-parent
     x-children[.prop=x]
   ```

   子组件中通过`this.prop`或`$prop`访问

3. **通过DOM属性传递**：设置HTML属性，子组件通过`attributeChangedCallback`接收，此方式只能传递字符串类型的参数

   ```stylus
   x-parent
     x-children[attr=x]
   ```

## 子组件向父组件传递数据

1. **通过事件传递**：子组件通过`emit`发送事件，父组件通过`on`监听，或使用DOM事件的冒泡机制
2. **通过对象属性或方法传递**：直接访问父组件DOM对象的属性或方法

   ```ts
   // 子组件中
   const parent = this.parentElement
   parent.someMethod(data)
   ```

## 跨层级通信

对于跨层级的组件通信，推荐使用`EventOf`创建全局事件中心：

```ts
// event-bus.ts
import { EventOf } from 'cydon'
export const eventBus = new EventOf()

// 任意组件中
import { eventBus } from './event-bus'
eventBus.emit('globalEvent', data)
eventBus.on('globalEvent', handler)
```