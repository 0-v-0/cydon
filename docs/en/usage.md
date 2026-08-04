# Standalone Script

This is the simplest way to use Cydon, typically used for simple applications, for example:

## Standard Approach

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

## Declarative Approach

The above example can be written declaratively (requires importing `cydon/declarative`):

```html
<main c-data="{ msg: 'foo', css_class: 'bold red', count: 0 }">
    <div class="$css_class">$msg</div>
    <p>count: $count</p>
    <button @click="count++">+1</button>
    <button @click="confirm('Are you sure?') && (count = 0)">reset</button>
</main>
```

How the declarative approach works:

1. When the `DOMContentLoaded` event fires, traverse all elements under `document.body`.
2. Find elements with a `c-data` attribute.
3. Parse the `c-data` attribute value as a data object via `Function('return ' + data)`.
4. Create a `Cydon` instance and automatically mount it to the element.

> **Note**: The declarative approach does not require manually creating an instance or calling `mount`, but its functionality is relatively limited, making it suitable for simple interaction scenarios.

# Using with Web Components

This is the most common way to use Cydon, for example: [Paginated Table Component](./s-table.md)

## Basic Pattern

1. Define a component class that extends `CydonElement`.
2. Use the `@define` decorator to register the custom element.
3. Write an EMT template.
4. Reference the component by its tag name in other components or pages.

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

## Progressive Enhancement

Cydon supports progressive enhancement. You can:

1. First build the page with native HTML.
2. Introduce Cydon in parts that need interaction.
3. Gradually refactor interactive parts into Web Components.

```html
<!-- Native HTML -->
<div id="app">
    <h1>Static Title</h1>
    <div class="counter">
        <span>0</span>
        <button>+1</button>
    </div>
</div>

<!-- After introducing Cydon -->
<div id="app">
    <h1>Static Title</h1>
    <my-counter></my-counter>
</div>
<script type="module">
import './my-counter'
</script>
```