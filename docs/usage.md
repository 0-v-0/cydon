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

# 与Web Components配合使用
这是最常见的使用 Cydon 的方式，例如：[翻页表格组件](./s-table.md)

