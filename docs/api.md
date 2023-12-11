# API

## 全局API

### CydonOf(base: Constructor<T> = Object)
创建一个响应式类

`Cydon`就是`CydonOf(Object)`，`CydonElement`就是`CydonOf(HTMLElement)`

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

### EventOf(obj: Object)
创建一个轻量级的事件目标

### watch(cydon: Cydon, f: Target['f'], node: Element | Text)
立即运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新执行

参数：
- `cydon`：Cydon实例
- `f`：要执行的函数，调用函数时this指向数据对象
- `node`：传递给函数的第一个参数

返回值是一个用来停止该副作用的函数，该函数返回是否成功移除该副作用

## 应用实例API
提示：ShadowRoot属于DocumentFragment的一种

### new(data?: Data, ...args: ConstructorParameters<Constructor<T>>)
创建一个Cydon实例

参数：
- `data`：数据对象
- `args`：传给基类的参数

### mount(el: Element | DocumentFragment = this)
将Cydon实例挂载到一个元素或DocumentFragment上

参数：
- `el`：目标元素或DocumentFragment

### unmount(el: Element | DocumentFragment)
将Cydon实例从目标元素上解绑

参数：
- `el`：目标元素或DocumentFragment

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

### updateValue(prop: string)
将`prop`加入更新队列

### commit()
强制更新 DOM 的工具方法

与Vue的nextTick类似

### connectedCallback()
当组件被添加到DOM树中时调用，属于Web Components标准中的方法