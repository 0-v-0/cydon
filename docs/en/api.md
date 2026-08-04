# API

## Global API

### CydonOf(base: `Constructor<T>` = Object)

Creates a reactive class. `Cydon` is `CydonOf(Object)`, `CydonElement` is `CydonOf(HTMLElement)`.

Parameters:
- `base`: Base class constructor, defaults to `Object`

Returns: A new class that extends `base` and mixes in Cydon's reactive capabilities

For example:

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

### `EventOf<Events>(base: Constructor<T> = Object, events?: EventHandlerMap<Events>)`

Creates a class with event capabilities.

Parameters:
- `base`: Base class constructor, defaults to `Object`
- `events`: Initial event handler map, defaults to an empty object

Returns: A new class that extends `base` and mixes in event capabilities (`on`, `off`, `emit` methods)

The returned class has the following methods:

| Method | Description |
| --- | --- |
| `on(type, func)` | Listens to an event, returns `this` |
| `off(type, func?)` | Stops listening to an event; if `func` is not provided, removes all listeners for that event; if `type` is falsy, clears all events, returns `this` |
| `emit(type, ...args)` | Emits an event, returns `this` |

### watch(cydon: Cydon, f: Target['f'], node?: Element | Text)

Immediately runs a function while reactively tracking its dependencies, and re-executes when dependencies change.

Parameters:
- `cydon`: Cydon instance
- `f`: Function to execute; `this` points to the data object, the first argument `$e` is the bound node
- `node`: The first argument passed to `f`, defaults to the Cydon instance itself

Returns a function to stop the side effect; calling it returns whether the side effect was successfully removed.

Example:

```ts
import { watch, Cydon } from 'cydon'
const app = new Cydon({ count: 0 })
app.mount(document.body)
// Automatically re-executes when count changes
const stop = watch(app, function(el) {
    el.textContent = this.count
})
// Stop watching
stop()
```

### define(tagName: string, options?: ElementDefinitionOptions)

Decorator for registering a class as a custom element (Web Component).

Parameters:
- `tagName`: Custom element tag name, must contain a hyphen (e.g. `my-component`)
- `options`: Options passed to `customElements.define`, e.g. `{ extends: 'p' }` for custom built-in elements

This decorator supports both TypeScript native decorators and Stage 3 decorators:

```ts
import { define } from 'cydon'

// TypeScript decorator usage
@define('my-element')
class MyElement extends HTMLElement { /* … */ }

// JavaScript or when not using decorators, use the native approach:
class MyElement extends HTMLElement { /* … */ }
customElements.define('my-element', MyElement)
```

### toFunction(code: string)

Converts a code string into a function. The function executes with `with(this)` context, and the first argument is `$e`.

Parameters:
- `code`: The code string to execute

Returns: A function whose `this` points to the data object, and the first argument is `$e` (the bound element)

Note: This function has a caching mechanism; the same code string is only compiled once.

### setData(cydon: Cydon, data?: Data, parent?: Data)

Sets a reactive data proxy for a Cydon instance.

Parameters:
- `cydon`: Cydon instance
- `data`: Data object, defaults to the Cydon instance itself
- `parent`: Parent data object; when setting a non-existent property in the current scope, it falls back to the parent scope

## Application Instance API

Note: [ShadowRoot](https://developer.mozilla.org/docs/Web/API/ShadowRoot) is a type of [DocumentFragment](https://developer.mozilla.org/docs/Web/API/DocumentFragment).

### `new(data?: Data, ...args: ConstructorParameters<Constructor<T>>)`

Creates a Cydon instance.

Parameters:
- `data`: Data object, which will be wrapped with `Proxy` for reactivity
- `args`: Arguments passed to the base class

### mount(el: Element | DocumentFragment = this)

Mounts a Cydon instance to an element or DocumentFragment, compiling the template and binding reactive data.

Parameters:
- `el`: Target element or DocumentFragment, defaults to the instance itself (for CydonElement)

### unmount(el: Element | DocumentFragment | null = this)

Unmounts a Cydon instance from the target element.

Parameters:
- `el`: Target element or DocumentFragment. If `null` is passed, clears all bindings for nodes not connected to the DOM.

### compile(results: Results, el: Element | DocumentFragment)
Compiles all templates under an element or Shadow Root.

Parameters:
- `results`: Compilation results
- `el`: Target element or DocumentFragment

### bind(results: Results, el: Element | DocumentFragment = this)

Binds template compilation results to an element or Shadow Root.

Parameters:
- `results`: Compilation results
- `el`: Target element or Shadow Root

### bindNode(node: Element | Text, part: Part): Target

Binds a node with the specified Part and immediately updates the node.

Parameters:
- `node`: The node to bind
- `part`: Part object containing the update function and dependency information

Returns: Target object

### updateValue(prop: string)

Adds `prop` to the update queue, batch-updating the DOM in the next microtask.

Parameters:
- `prop`: The property name to update

### commit()

Immediately executes all DOM updates in the queue and clears the queue.

Similar to Vue's `nextTick`, but `commit` executes updates synchronously.

### connectedCallback()

Called when the component is added to the DOM tree. This is part of the [Web Components](https://developer.mozilla.org/docs/Web/API/Web_components) standard. This method automatically calls `mount()` for template compilation and data binding.

When overriding this method, ensure you call `super.connectedCallback()` to bind reactive data.

## Instance Fields

### $data

The raw data object (non-reactive), type is `Data`. Directly modifying properties on `$data` will **not** trigger DOM updates.

### data

The reactive data object (wrapped with `Proxy`), type is `Data`. Modifying properties through `data` will trigger DOM updates.

```ts
const app = new Cydon({ count: 0 })
app.mount(el)
app.data.count++ // Triggers DOM update
app.$data.count++ // Does not trigger DOM update
```

### $queue

The render queue, type is `Map<string, number>`. Keys are property names, values are the number of times the property has been updated in the current batch.

### $targets

The set of bound nodes, type is `Set<Target>`.

### $limits

The update count limit per property in a single `commit`, type is `Map<string, number>`. When a property reaches its update limit in a single `commit`, subsequent updates for that property are skipped to prevent infinite loops.

### $directives

The list of directive handler functions, type is `DirectiveHandler[]`. Defaults to the global directive list, can be overridden with a local directive list.

## Types

### Data

```ts
type Data = Record<string, any>
```

Data object type.

### Dep

```ts
type Dep = Set<string>
```

Dependency set, stores property names.

### Container

```ts
type Container = Element | DocumentFragment
```

Container type, can be an element or document fragment.

### Part

```ts
type Part = {
    a?: string       // Attribute name, empty means text node
    deps?: Dep       // Dependency set
    f(this: Data, el: Element): any  // Update function
}
```

Mutable part descriptor after template compilation.

### Target

```ts
type Target = Part & {
    n: Element | Text  // Bound DOM node
    deps: Dep          // Dependency set
    x: Data            // Data object
}
```

Bound target object, an extension of Part.

### Directive

```ts
interface Directive extends Part {
    keep?: boolean  // When true, the attribute is not removed after compilation
}
```

Directive definition, extending Part.

### DirectiveHandler

```ts
type DirectiveHandler = (
    name: string,      // Attribute name
    value: string,     // Attribute value
    el: Element,       // Element
    attrs: AttrMap,    // Bound attribute map
    parent?: ParentNode // Parent node (exists in c-for)
) => Directive | void
```

Directive handler function type.

### Results

```ts
type Results = (AttrMap | Result | number)[]
```

Template compilation result type.

### AttrMap

```ts
type AttrMap = Map<string | symbol, Part>
```

Map from attribute to Part.