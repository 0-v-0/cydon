# Directives

## Note

The more directives registered, the slower the compilation. It is recommended to register custom directives only as needed.

## Built-in Directives

Note: All built-in directives do not support interpolation (dynamic attribute values). For example, `ref="$name"` means saving the raw DOM element object to `$data.$name`, where `$name` is not replaced by the value of `name`.

### c-show

Toggles the visibility of an element based on the truthiness of the expression value.

**Expected bound value type:** `any`

`c-show` works by setting the `display` CSS property via inline styles. When the element is visible, its initial `display` value is used.

```html
<p c-show="visible">Hello</p>
```

When `visible` is falsy, the element is set to `display: none`; when `visible` is truthy, the initial `display` value is restored.

### c-if

Conditionally renders an element based on the truthiness of the expression value. Unlike `c-show`, `c-if` actually adds or removes DOM elements.

**Expected bound value type:** `any`

- When the value is truthy: `mount` is called, then the element is inserted into the DOM.
- When the value is falsy: `unmount` is called, then the element is replaced with a comment node.

```html
<p c-if="show">Conditional content</p>
```

> `c-if` has higher toggle overhead (requires creating/destroying DOM), while `c-show` has higher initial render cost. If you need to toggle frequently, prefer `c-show`.

### c-model

Creates two-way binding on form input elements.

Supported elements:
- `<input>`
- `<select>`
- `<textarea>`
- components

When the bound variable type is `number`, the value is automatically converted to `number` on assignment.

Modifier: `.lazy` — listens to `change` events instead of `input`. For `<select>`, `input type=radio`, and `input type=checkbox`, the `change` event is always used, so this modifier is unnecessary.

Note: Interpolation expressions are not supported inside `<textarea>`. Use `.value` or `c-model` instead.

**Behavior for different form elements:**

| Element Type/Attribute | Bound Value | Event (without `.lazy`) | Description |
| --- | --- | --- | --- |
| `input type=text` | `value` | `input` | Text input |
| `input type=radio` | `checked` (when value matches) | `change` | Selected when the `value` attribute matches the bound value |
| `input type=checkbox` | `checked` | `change` | Boolean binding |
| `select` (single) | `value` | `change` | Dropdown selection |
| `select` (multiple) | `selectedOptions` array | `change` | Bound value is an array for multi-select |
| `textarea` | `value` | `input` | Text area |

**IME Composition:** `c-model` automatically handles IME composition states. Updates are not triggered during composition input; data is only updated when composition is complete.

Example:

```html
<input c-model="msg" placeholder="Enter text">
<p>$msg</p>

<input type="checkbox" c-model="checked">

<select c-model="selected">
    <option value="a">A</option>
    <option value="b">B</option>
</select>

<select c-model="selectedItems" multiple>
    <option value="a">A</option>
    <option value="b">B</option>
</select>
```

### ref

Saves the raw DOM element object to `$data` under the property name specified by the `ref` attribute value. Same property names will be overwritten.

```html
<input ref="inputEl">
<button @click="inputEl.focus()">Focus</button>
```

### c-for

Renders child components multiple times based on an array of data. Can only be used on `<template>`. **When this directive is present, other directives are ignored.**

**Expected bound value type:** `object[]`

Example: `c-for="item, index; items"`, where `index` can be omitted.

When no parameters are provided, compilation of the element and all its children is skipped, and all template syntax is preserved and rendered as-is.

**Update Strategy:**

When data changes, an in-place update strategy is used.

When array items are objects, Cydon reuses existing DOM elements and only updates the changed data properties, rather than recreating the DOM. When array items are primitive values, the values are directly assigned and updates are triggered.

When the array length changes, Cydon automatically adds or removes DOM elements:
- Adding elements: creates a new DocumentFragment and binds it.
- Removing elements: removes excess DOM nodes and cleans up disconnected bindings via `requestIdleCallback` during idle time.

```html
<ul>
    <template c-for="item, index; list">
        <li>${index}: ${item.name}</li>
    </template>
</ul>
```

### c-tp

Teleports inner elements to a target element. Can only be used on `<template>`.

The value can be a property name that holds a DOM element object, or a CSS selector string.

If the value is empty or the referenced object property is empty, the teleport is disabled and inner elements are rendered in place.

Example:

```html
<template c-tp="body">
    <div>This element will be teleported to body</div>
</template>

<template c-tp="targetEl">
    <div>This element will be teleported to the element pointed to by data.targetEl</div>
</template>

<template c-tp="">
    <div>This element will render in place</div>
</template>
```

### @*event*

Binds an event listener to an element.

**Expected bound value type:** `Function | Inline Statement`

The attribute value can be a method name or an inline expression. If a corresponding method name exists in the data object, that method is called; otherwise, it is treated as an inline expression.

In inline expressions, `$e` refers to the Event object, and the expression is executed in a `with(this)` context.

**Event Delegation:** For non-`capture`, non-`once`, and non-`$` dynamic events that are inside a `c-for` loop (where a `parent` scope exists), Cydon delegates event listeners to the root node (Document or ShadowRoot) and triggers via event bubbling, reducing the number of event listeners.

#### Modifiers

- `.away`: The handler only executes when the event is triggered from outside the element. The element must be able to contain child elements.
- `.capture`: Adds the event listener in capture mode. Event delegation is not used in capture mode.
- `.once`: The handler is triggered at most once. Event delegation is not used with `once`.
- `.passive`: Attaches a DOM event with `{ passive: true }`.

Multiple modifiers can be used together, e.g., `@click.capture.once`.

```html
<button @click="count++">+1</button>
<button @click.once="submit">Submit</button>
<div @click.away="close">Click outside to close</div>
```

### @$*event*

Dynamic event name binding, similar to @*event*. The event name is obtained from the data object but is only evaluated once at bind time.

```html
<button @$evt="handler">Dynamic event</button>
```

```ts
// data
{ evt: 'click', handler() { /* ... */ } }
```

### :

Executes an inline reactive statement. It runs once during component initialization, tracks dependencies, and re-executes when dependencies change. Similar to [petite-vue](https://github.com/vuejs/petite-vue)'s `v-effect`.

**e.g.** Achieving the same effect as `<p c-text="msg"></p>`:

```html
<p :="$e.textContent = msg"></p>
```

### :*attr*

Conditional attribute binding, typically used for the `class` attribute. Dynamically binds multiple class names based on conditions.

For `:class="a: cond1; b: cond2"`:
- When `cond1`, `cond2` are truthy: `class="a b"`
- When `cond1` is truthy: `class="a"`
- When `cond2` is truthy: `class="b"`
- When `cond1`, `cond2` are falsy: `class=""`

### .*prop*

DOM object property binding. The attribute value is an expression whose result is assigned to the corresponding property.

**e.g.**

```html
<option .selected="count == input.value" value="$count">$count</option>
```

### c-cloak

Used to hide DOM elements that have not yet been initialized. This attribute is removed after component initialization.

Typically used with CSS:

```css
[c-cloak] { display: none }
```

### $*attr*

Dynamic attribute name. The attribute name is obtained from the data object.

```html
<button $attr="value">Dynamic attribute</button>
```

## Custom Directives

### Global Directives

All global directive handler functions are in the `directives` array.

```js
import { directives } from 'cydon'
```

There are two ways to register global directives:

1. Insert before built-in directives (can change built-in directive behavior):

```js
directives.unshift(handler)
```

2. Insert after built-in directives (cannot change built-in directive behavior):

```js
directives.push(handler)
```

Where `handler` is a directive handler function. When the function returns a truthy value, subsequent directive handler functions in `directives` are skipped and the attribute is **removed** from the DOM.

If you need to keep the attribute, add `keep: true` to the returned object.

**DirectiveHandler Function Signature:**

```ts
type DirectiveHandler = (
    name: string,       // Attribute name
    value: string,      // Attribute value
    el: Element,        // Target element
    attrs: AttrMap,     // Current element's bound attribute map
    parent?: ParentNode // Parent node (only exists in c-for)
) => Directive | void
```

When the returned object does not have a `deps` property (one-time directive):

```js
directives.push((name, value, el, attrs, parent) => {
  // Executed during template compilation
  // …
  return {
    f(el) {
      // Executed when binding the element; `this` points to the cydon instance's data object
    }
  }
})
```

When the returned object has a `deps` property (reactive directive):

```js
directives.push((name, value, el, attrs, parent) => {
	// Executed during template compilation
	// …

	// Allows registering multiple Targets in a single directive handler
	attrs.set(Symbol('xxx'), {
		f(el) {
			// Executed when binding the element; execution order takes precedence over the f function below
		}
	})

	return {
		deps: new Set // Associated dependencies
		f(el) {
			// Executed when binding the element or when associated dependencies update; `this` points to the cydon instance's data object
		}
	}
})
```

### Local Directives

Each cydon instance's `$directives` field represents the list of local directive handler functions. This field defaults to the global directive list.

```js
this.$directives.push((name, value, el) => {
	if (name == 'attr') {
		//...
	}
})
```

The above example directly modifies this field, which affects the global directive list. If you need to preserve global directives without affecting the global list, use a shallow copy:

```js
import { directives } from 'cydon'
//...
this.$directives = [(name, value, el) => {
	if (name == 'attr') {
		//...
	}
}, ...directives]
```

## Custom Directive Examples

### to-remove

Elements with this attribute are automatically removed when the page finishes loading.

```js
directives.push((name, value, el) => {
	if (name == 'to-remove')
		return {
			f(el) {
				addEventListener('load', () => el.remove())
			}
		}
})
```

### c-text

Reactively updates the text content of an element to the string representation of the specified expression result.

```ts
(name, value): Directive | void => {
	if (name == 'c-text') {
		const func = toFunction('return ' + value)
		return {
			deps: new Set,
			f(el) {
				el.textContent = func.call(this, el)
			}
		}
	}
}
```