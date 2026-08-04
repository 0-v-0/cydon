# 独立脚本

这是最简单的使用 Cydon 的方式，通常用于简单的应用，例如：

## 一般写法

```html
<main id="app">
    <div class="$css_class">$msg</div>
    <p>count: $count</p>
    <button @click="count++">+1</button>
    <button @click="reset">reset</button>
</main>
<script type="module">
import { Cydon } from 'cydon'

const app = new Cydon({
  msg: 'foo',
  css_class: 'bold red',
  count: 0,
  reset() {
    if (confirm('Are you sure?'))
      this.count = 0
  }
})
app.mount(document.getElementById('app'))

const { data } = app
data.msg = 'Hello world'
data.css_class = 'gray'
</script>
```

## 声明式写法

上面的例子可以写成声明式写法：（需引入`cydon/declarative`）

```html
<main c-data="{ msg: 'foo', css_class: 'bold red', count: 0 }">
    <div class="$css_class">$msg</div>
    <p>count: $count</p>
    <button @click="count++">+1</button>
    <button @click="confirm('Are you sure?') && (count = 0)">reset</button>
</main>
```

声明式写法的工作原理：

1. 在`DOMContentLoaded`事件触发时，遍历`document.body`下的所有元素
2. 查找带有`c-data`属性的元素
3. 将`c-data`的属性值作为数据对象，通过`Function('return ' + data)`解析
4. 创建`Cydon`实例并自动挂载到该元素上

> **注意**：声明式写法不需要手动创建实例和调用`mount`，但功能相对有限，适合简单的交互场景

# 与Web Components配合使用

这是最常见的使用 Cydon 的方式，例如：[翻页表格组件](./s-table.md)

## 基本模式

1. 定义组件类，继承`CydonElement`
2. 使用`@define`装饰器注册自定义元素
3. 编写EMT模板
4. 在其他组件或页面中使用标签名引用

MyGreeting.ts
```ts
import { define, CydonElement } from 'cydon'

@define('my-greeting')
class MyGreeting extends CydonElement {
    name = 'World'
}
```

my-greeting.emt
```stylus
template[shadowrootmode=open]
    span{Hello, $name!}
```

index.emt
```stylus
my-greeting[name=Cydon]
```

## 渐进式增强

Cydon支持渐进式增强，你可以：

1. 先用原生HTML构建页面
2. 在需要交互的部分引入Cydon
3. 逐步将交互部分重构为Web Components

```html
<!-- 原生HTML -->
<div id="app">
    <h1>静态标题</h1>
    <div class="counter">
        <span>0</span>
        <button>+1</button>
    </div>
</div>

<!-- 引入Cydon后 -->
<div id="app">
    <h1>静态标题</h1>
    <my-counter></my-counter>
</div>
<script type="module">
import './my-counter'
</script>
```

