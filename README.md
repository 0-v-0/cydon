# Cydon
A lightweight library for building fast, reactive web components.

## 特点
- 轻量级：~3kB minified & brotli'd
- 采用模板语法，所见即所得
- 组件即元素：无虚拟DOM
- 不错的性能

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
    app.mount(document.body)
    const { data } = app
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
