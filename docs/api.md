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

## 应用实例API

### new(data?: Data, ...args: ConstructorParameters<Constructor<T>>)
创建一个Cydon实例

参数：
- `data`：数据对象
- `args`：传给基类的参数

### mount(el: Element | ShadowRoot = this)
将Cydon实例挂载到一个元素或ShadowRoot上

参数：
- `el`：目标元素或ShadowRoot

### unmount(el: Element | ShadowRoot)
将Cydon实例从目标元素上解绑

参数：
- `el`：目标元素或Shadow Root

### compile(results: Results, el: Element | ShadowRoot)
编译一个元素或Shadow Root下的所有模板

参数：
- `results`：编译结果
- `el`：目标元素或Shadow Root

### bind(results: Results, el: Element | ShadowRoot = this)
将模板编译结果绑定到一个元素或Shadow Root

参数：
- `results`：编译结果
- `el`：目标元素或Shadow Root

### add(node: Element | Attr | Text, part: Part)
添加目标节点并加入到更新队列中

参数：
- `node`：目标节点
- `part`：表达式

### update(target: Target)
更新目标节点

### updateValue(prop: string)
将`prop`加入更新队列

### flush()
强制更新 DOM 的工具方法

与Vue的nextTick类似，Cydon底层通过requestAnimationFrame调用此函数实现异步渲染

### connectedCallback()
当组件被添加到DOM树中时调用，属于Web Components标准中的方法