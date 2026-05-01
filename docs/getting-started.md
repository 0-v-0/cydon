# Getting Started

## Install

```sh
pnpm i cydon
```

也可以通过CDN使用：

```html
<script type="module">
import { Cydon } from 'https://esm.run/cydon'
</script>
```

## Browser Support

- Chrome 93+
- Firefox 92+
- Safari 15.4+ (need requestIdleCallback polyfill)

## 快速上手

### 1. 创建响应式应用

最简单的方式是使用`Cydon`类：

```html
<div id="app">
    <h1>$title</h1>
    <p>计数: $count</p>
    <button @click="count++">增加</button>
</div>
<script type="module">
import { Cydon } from 'cydon'

const app = new Cydon({
    title: 'Hello Cydon',
    count: 0
})
app.mount(document.getElementById('app'))
</script>
```

### 2. 创建Web Component

使用`CydonElement`和`define`装饰器：

```ts
import { define, CydonElement } from 'cydon'

@define('my-counter')
class MyCounter extends CydonElement {
    count = 0
}
```

```stylus
{$count}
button[@click=count++]{+1}
button[@click=count--]{-1}
```

### 3. 声明式用法

无需编写JavaScript，直接在HTML中使用：

```html
<script type="module">
import 'cydon/declarative'
</script>

<div c-data="{ count: 0 }">
    <p>$count</p>
    <button @click="count++">+1</button>
</div>
```

## 核心概念

- **响应式**：通过`Proxy`实现，修改`data`对象的属性会自动更新DOM
- **模板语法**：使用`$`进行文本插值，使用`@`绑定事件，使用`c-*`指令控制渲染
- **Web Components**：基于原生Web Components标准，无需虚拟DOM
- **异步更新**：DOM更新通过`queueMicrotask`批量执行，避免频繁重绘
