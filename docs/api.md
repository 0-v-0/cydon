# API

## 全局API

### CydonOf(base: `Constructor<T>` = Object)

创建一个响应式类。`Cydon`就是`CydonOf(Object)`，`CydonElement`就是`CydonOf(HTMLElement)`

参数：
- `base`：基类构造函数，默认为`Object`

返回值：一个新的类，继承自`base`，并混入了Cydon的响应式能力

例如：

```html
<div class="card">$msg</div>
<div class="$css_class">$msg</div>
<script type="module">
    import { Cydon } from 'cydon'

    const app = new Cydon({
        msg: 'Hello world',
        css_class: 'bold red'
    })
    app.mount(document.body)
    let { data } = app
    data.msg = 'foo'
    data.css_class = 'bar'
</script>
```

### `EventOf<Events>(base: Constructor<T> = Object, events?: EventHandlerMap<Events>)`

创建一个带有事件能力的类

参数：
- `base`：基类构造函数，默认为`Object`
- `events`：初始事件处理器映射表，默认为空对象

返回值：一个新的类，继承自`base`，并混入了事件能力（`on`、`off`、`emit`方法）

返回的类具有以下方法：

| 方法 | 说明 |
| --- | --- |
| `on(type, func)` | 监听事件，返回`this` |
| `off(type, func?)` | 停止监听事件，若不传`func`则移除该事件的所有监听器；若`type`为falsy值则清空所有事件，返回`this` |
| `emit(type, ...args)` | 触发事件，返回`this` |

### watch(cydon: Cydon, f: Target['f'], node?: Element | Text)

立即运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新执行

参数：
- `cydon`：Cydon实例
- `f`：要执行的函数，调用函数时`this`指向数据对象，第一个参数`$e`为绑定的节点
- `node`：传递给`f`的第一个参数，默认为Cydon实例自身

返回值是一个用来停止该副作用的函数，调用后返回是否成功移除该副作用

示例：

```ts
import { watch, Cydon } from 'cydon'
const app = new Cydon({ count: 0 })
app.mount(document.body)
// 当count变化时自动重新执行
const stop = watch(app, function(el) {
    el.textContent = this.count
})
// 停止监听
stop()
```

### define(tagName: string, options?: ElementDefinitionOptions)

装饰器，用于将类注册为自定义元素（Web Component）

参数：
- `tagName`：自定义元素标签名，必须包含连字符（如`my-component`）
- `options`：传递给`customElements.define`的选项，如`{ extends: 'p' }`用于自定义内置元素

该装饰器同时支持TypeScript原生装饰器和Stage 3装饰器：

```ts
import { define } from 'cydon'

// TypeScript装饰器用法
@define('my-element')
class MyElement extends HTMLElement { /* … */ }

// JavaScript或不使用装饰器时，使用原生写法：
class MyElement extends HTMLElement { /* … */ }
customElements.define('my-element', MyElement)
```

### toFunction(code: string)

将代码字符串转换为函数，函数内部使用`with(this)`上下文执行，第一个参数为`$e`

参数：
- `code`：要执行的代码字符串

返回值：一个函数，其`this`指向数据对象，第一个参数为`$e`（绑定的元素）

注意：该函数有缓存机制，相同的代码字符串只会编译一次

### setData(cydon: Cydon, data?: Data, parent?: Data)

为Cydon实例设置响应式数据代理

参数：
- `cydon`：Cydon实例
- `data`：数据对象，默认为Cydon实例自身
- `parent`：父级数据对象，当在当前作用域设置一个不存在的属性时，会回退到父级作用域

## 应用实例API

提示：[ShadowRoot](https://developer.mozilla.org/docs/Web/API/ShadowRoot)属于[DocumentFragment](https://developer.mozilla.org/docs/Web/API/DocumentFragment)的一种

### `new(data?: Data, ...args: ConstructorParameters<Constructor<T>>)`

创建一个Cydon实例

参数：
- `data`：数据对象，该对象将被`Proxy`包装以实现响应式
- `args`：传给基类的参数

### mount(el: Element | DocumentFragment = this)

将Cydon实例挂载到一个元素或DocumentFragment上，会编译模板并绑定响应式数据

参数：
- `el`：目标元素或DocumentFragment，默认为实例自身（适用于CydonElement）

### unmount(el: Element | DocumentFragment | null = this)

将Cydon实例从目标元素上解绑

参数：
- `el`：目标元素或DocumentFragment。若传入`null`，则清除所有未连接到DOM的节点绑定

### compile(results: Results, el: Element | DocumentFragment)
编译一个元素或Shadow Root下的所有模板

参数：
- `results`：编译结果
- `el`：目标元素或DocumentFragment

### bind(results: Results, el: Element | DocumentFragment = this)

将模板编译结果绑定到一个元素或Shadow Root

参数：
- `results`：编译结果
- `el`：目标元素或Shadow Root

### bindNode(node: Element | Text, part: Part): Target

绑定一个节点与指定的Part，并立即更新该节点

参数：
- `node`：要绑定的节点
- `part`：Part对象，包含更新函数和依赖信息

返回值：Target对象

### updateValue(prop: string)

将`prop`加入更新队列，在下一个微任务中批量更新DOM

参数：
- `prop`：要更新的属性名

### commit()

立即执行所有在更新队列中的DOM更新，并清空队列

与Vue的`nextTick`类似，但`commit`是同步执行更新

### connectedCallback()

当组件被添加到DOM树中时调用，属于[Web Components](https://developer.mozilla.org/docs/Web/API/Web_components)标准中的方法。该方法会自动调用`mount()`进行模板编译和数据绑定

重写这个方法时确保调用`super.connectedCallback()`以绑定响应式数据

## 实例字段

### $data

原始数据对象（非响应式），类型为`Data`。直接修改`$data`上的属性**不会**触发DOM更新

### data

响应式数据对象（`Proxy`包装），类型为`Data`。通过`data`修改属性会触发DOM更新

```ts
const app = new Cydon({ count: 0 })
app.mount(el)
app.data.count++ // 触发DOM更新
app.$data.count++ // 不会触发DOM更新
```

### $queue

渲染队列，类型为`Map<string, number>`。键为属性名，值为该属性在当前批次中的更新次数

### $targets

绑定的节点集合，类型为`Set<Target>`

### $limits

每个属性性在单次`commit`中的更新次数限制，类型为`Map<string, number>`。当某个属性在单次`commit`中更新次数达到限制时，将跳过该属性的后续更新，防止无限循环

### $directives

指令处理函数列表，类型为`DirectiveHandler[]`。默认为全局指令列表，可修改为局部指令列表

## 类型

### Data

```ts
type Data = Record<string, any>
```

数据对象类型

### Dep

```ts
type Dep = Set<string>
```

依赖集合，存储属性名

### Container

```ts
type Container = Element | DocumentFragment
```

容器类型，可以是元素或文档片段

### Part

```ts
type Part = {
    a?: string       // 属性名，为空表示文本节点
    deps?: Dep       // 依赖集合
    f(this: Data, el: Element): any  // 更新函数
}
```

模板编译后的可变部分描述

### Target

```ts
type Target = Part & {
    n: Element | Text  // 绑定的DOM节点
    deps: Dep          // 依赖集合
    x: Data            // 数据对象
}
```

绑定的目标对象，是Part的扩展

### Directive

```ts
interface Directive extends Part {
    keep?: boolean  // 为true时编译后不删除该属性
}
```

指令定义，扩展自Part

### DirectiveHandler

```ts
type DirectiveHandler = (
    name: string,      // 属性名
    value: string,     // 属性值
    el: Element,       // 元素
    attrs: AttrMap,    // 已绑定的属性映射
    parent?: ParentNode // 父节点（在c-for中存在）
) => Directive | void
```

指令处理函数类型

### Results

```ts
type Results = (AttrMap | Result | number)[]
```

模板编译结果类型

### AttrMap

```ts
type AttrMap = Map<string | symbol, Part>
```

属性到Part的映射
