# 事件

## 事件绑定

以`@`开头的属性用于绑定事件，例如：

```stylus
button[@click="alert('Hello')"]{Click me}
```

属性值可以为方法名或表达式，若不存在对应方法，则视为表达式

内联表达式中`$e`指向Event对象，表达式将在`with(this)`上下文中执行

当表达式太长时，可以作为方法放到自定义元素类中，属性值为方法名，方法的第一个参数为事件对象

```stylus
my-element
    {$msg}
    button[@click=func]{Click me}
```

```ts
@define('my-element')
class MyElement extends CydonElement {
	msg = ''

	func(e: Event) {
        // 这里的this为Proxy对象，因此所有对this所作的更改将会同步到DOM中
        this.msg = 'OK'
    }
}
```

## 事件委托

Cydon默认使用事件委托机制来优化性能。对于非`capture`、非`once`且非`$`动态事件，事件监听器会被委托到根节点（Document或ShadowRoot），而不是直接绑定到每个元素上。

事件委托的工作原理：
1. 在根节点上添加一个统一的事件监听器
2. 当事件触发时，通过`event.target`向上查找绑定了该事件处理器的元素
3. 找到后调用对应的处理函数，并停止向上查找

这种机制减少了事件监听器的数量，特别适合列表等大量元素的场景。

## 事件修饰符

修饰符以`.`分隔，跟在事件名后面，支持多个修饰符同时使用：

```stylus
button[@click.capture.once]{只触发一次}
```

| 修饰符 | 说明 |
| --- | --- |
| `.away` | 只有事件从元素外部触发才执行处理函数，适用于点击外部关闭弹窗等场景 |
| `.capture` | 在捕获阶段添加事件监听器，使用此修饰符时不会进行事件委托 |
| `.once` | 最多触发一次处理函数，触发后自动移除，使用此修饰符时不会进行事件委托 |
| `.passive` | 通过`{ passive: true }`附加DOM事件，用于优化滚动等高频事件的性能 |

### .away 示例

```stylus
.dialog[@click.away=close]
  {内容}
```

当点击`.dialog`外部时才会调用`close`方法

## 动态事件名称

事件名称也可以是动态的，以`@$`开头，事件名从数据对象中获取，但只会在绑定时计算一次：

```stylus
button[@$evt="alert('Hello')"]{Click me}
```

```ts
@define('my-element')
class MyElement extends CydonElement {
	evt = 'click'
}
```

## EventOf

`EventOf`是一个独立的事件系统，不依赖DOM，可用于组件间通信：

```ts
import { EventOf } from 'cydon'

const eventHub = new EventOf()

// 监听事件
eventHub.on('change', (value) => {
  console.log('changed:', value)
})

// 触发事件
eventHub.emit('change', 42)

// 移除特定监听器
const handler = (value) => console.log(value)
eventHub.on('change', handler)
eventHub.off('change', handler)

// 移除某个事件的所有监听器
eventHub.off('change')

// 清空所有事件监听器
eventHub.off()
```

`EventOf`也可以与基类组合使用：

```ts
import { EventOf } from 'cydon'

class MyClass extends EventOf() {
  doSomething() {
    this.emit('done', result)
  }
}
```

## composing

`c-model`内部使用`composing`（`WeakSet<EventTarget>`）来跟踪正在使用输入法组合的元素。在组合输入期间（如中文输入法），`c-model`不会触发数据更新，只有组合完成后才更新。

此集合是导出的，自定义指令也可以使用它来处理类似的输入法组合场景：

```ts
import { composing } from 'cydon'
```
