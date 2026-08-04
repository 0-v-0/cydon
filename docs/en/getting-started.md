# Getting Started

## Install

```sh
pnpm i cydon
```

Can also be used via CDN:

```html
<script type="module">
import { Cydon } from 'https://esm.run/cydon'
</script>
```

## Browser Support

- Chrome 93+
- Firefox 92+
- Safari 15.4+ (need requestIdleCallback polyfill)

## Quick Start

### 1. Create a Reactive Application

The simplest way is to use the `Cydon` class:

```html
<div id="app">
    <h1>$title</h1>
    <p>Count: $count</p>
    <button @click="count++">Increase</button>
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

### 2. Create a Web Component

Using `CydonElement` and the `define` decorator:

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

### 3. Declarative Usage

No JavaScript needed; use directly in HTML:

```html
<script type="module">
import 'cydon/declarative'
</script>

<div c-data="{ count: 0 }">
    <p>$count</p>
    <button @click="count++">+1</button>
</div>
```

## Core Concepts

- **Reactivity**: Implemented via `Proxy`; modifying properties of the `data` object automatically updates the DOM.
- **Template Syntax**: Use `$` for text interpolation, `@` for event binding, and `c-*` directives for render control.
- **Web Components**: Based on native Web Components standards; no virtual DOM needed.
- **Async Updates**: DOM updates are batched via `queueMicrotask` to avoid frequent repaints.