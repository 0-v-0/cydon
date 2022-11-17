# Cydon
A lightweight library for building fast, reactive web components.

## 特点
- 简单易用：采用模板语法，所见即所得
- 轻量小巧：Todo MVC构建后js大小约8kb
- 模块间低耦合：大部分模块可单独使用

# Usage

## basic
```html
<div class="card">$msg</div>
<div class="$css_class">$msg</div>
<script type="module">
    import { Cydon } from 'cydon'

    const app = new Cydon({
        msg: 'Hello world',
        css_class: 'bold red'
    })
    app.bind(document.body)
    let { data } = app
    data.msg = 'foo'
    data.css_class = 'bar'
</script>
```

## a simple counter

index.emt:
```styl
my-counter[value=1]
```

my-counter.emt:
```styl
template[shadowroot=open]
	style[lang=styl]{
		button
			padding 0.3em
		.wrapper
			display flex
			align-items center
	}
	.wrapper
		{$value}
        button[@click=value++]{+1}
        button[@click=value--]{-1}
script[type=module]{
	import { CydonElement, define } from 'cydon'

	@define('my-counter')
	class MyCounter extends CydonElement {
		value = +this.getAttribute('value')!
	}
}
```
equivalent HTML:
```html
<my-counter value="1">
    <template shadowroot="open">
        <style>
            button {
                padding: 0.3em;
            }
            .wrapper {
                display: flex;
                align-items: center;
            }
        </style>
        <div class="wrapper">
            $value
            <button @click="value++">+1</button>
            <button @click="value--">-1</button>
        </div>
    </template>
    <script type="module">
        /* ... */
    </script>
</my-counter>
```
