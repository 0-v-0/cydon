# Definition

## Defining a Web Component

In TypeScript, use the `define` decorator to define a Web Component.

```ts
define(tagName: string, options?: ElementDefinitionOptions): ClassDecorator
```

Parameters:
- `tagName`: Custom element tag name, must contain a hyphen (e.g. `my-component`)
- `options`: Options passed to `customElements.define`, e.g. `{ extends: 'p' }` for custom built-in elements

Usage:

```ts
import { define } from 'cydon'

@define('my-element')
class MyElement extends HTMLElement {
    /* … */
}
```

If you use JavaScript or do not use the decorator syntax, use the native approach:

```js
class MyElement extends HTMLElement {
    /* … */
}
customElements.define('my-element', MyElement)
```

If TypeScript type checking is needed, also add the following:

```ts
declare global {
	interface HTMLElementTagNameMap {
		'my-element': MyElement
	}
}
```

## Reactive Component

Let's implement a simple counter as an example: clicking the `+1` button increases the value by 1, clicking the `-1` button decreases the value by 1, and the initial value can be set via the `value` attribute.

### Defining the Component

my-counter.ts

```ts
import { define, CydonElement } from 'cydon'

@define('my-counter')
class MyCounter extends CydonElement {
	value = +this.getAttribute('value')!
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
	}
}
```

my-counter.emt

```stylus
{$value}
button[@click=value++]{+1}
button[@click=value--]{-1}
```

Here, `CydonElement` is `CydonOf(HTMLElement)`.

### Cydon vs CydonElement

| Class | Base Class | Use Case |
| --- | --- | --- |
| `Cydon` | `Object` | Non-Web Component scenarios, e.g., standalone scripts |
| `CydonElement` | `HTMLElement` | Web Component scenarios, automatically mounts in `connectedCallback` |

`CydonElement` automatically calls `mount()` in `connectedCallback`, so manual mounting is not needed.

### Custom Base Class

You can use `CydonOf` to create reactive classes based on other base classes:

```ts
import { CydonOf } from 'cydon'

// Based on another custom element
const MyBaseElement = CydonOf(SomeOtherElement)

@define('my-element')
class MyElement extends MyBaseElement {
  /* … */
}
```

## Using the Component

```stylus
my-counter
```

Setting the initial value:

```stylus
my-counter[value=1]
```

## Importing the Component

If you need to use the component without importing the symbol, just import it directly:

```ts
import './my-counter'
```

If you need to use `MyCounter` externally, add the `export` keyword before the class:

my-counter.ts:

```ts
@define('my-counter')
export class MyCounter extends CydonElement {
  /* … */
}
```

Import:

```ts
import { MyCounter } from './my-counter'
```

You can also use default exports:

my-counter.ts:

```ts
@define('my-counter')
export default class MyCounter extends CydonElement {
  /* … */
}
```

```ts
import MyCounter from './my-counter'
```

## Attribute Observation

If you need to observe changes to HTML attributes, define a static `observedAttributes` array and handle changes in `attributeChangedCallback`:

```ts
@define('my-input')
class MyInput extends CydonElement {
  static observedAttributes = ['value']

  value = ''

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name == 'value') {
      this.data.value = newVal
    }
  }
}
```

> **Note**: Cydon component initialization happens in the `connectedCallback` phase, which runs after `attributeChangedCallback`. If the attribute value contains interpolation expressions, the `newVal` parameter in the first `attributeChangedCallback` call will be the unrendered attribute value, and `oldVal` will be `null`.

## Scoped Styles

Use native Shadow DOM for style isolation:

```stylus
template[shadowrootmode=open]
  style{
    /* … */
  }
  /* … */
```

## Slots

Slots are part of native Web Components, not the framework.

my-counter.emt

```stylus
template[shadowrootmode=open]
		{$value}
		slot[name=increase]
			button[@click=value++]{+1}
		slot[name=decrease]
			button[@click=value--]{-1}
```

When using, you can customize button content via slots:

```stylus
my-counter
  button[slot=increase]{Increase}
  button[slot=decrease]{Decrease}
```