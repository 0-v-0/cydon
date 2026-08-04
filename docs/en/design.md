# Design Principles

This document provides an in-depth explanation of the core design principles of the Cydon framework, covering compilation, reactivity, binding, the directive system, and the component model. It helps readers understand how Cydon works and why it is designed this way.

## Design Philosophy

Cydon's design follows these core principles:

- **Minimalism**: The core code is about 400 lines of TypeScript with zero external runtime dependencies.
- **Native First**: Based on Web Components standards, leveraging native browser capabilities (Proxy, Custom Elements, Shadow DOM).
- **Declarative Templates**: Template syntax is close to native HTML, with `$var` interpolation and attribute directives that are intuitive and easy to understand.
- **Extensible on Demand**: Through the Mixin pattern and pluggable directive system, features can be combined on demand without introducing unnecessary code.

## Overall Architecture

```
DOM Tree ──compile() → Results[] ──bind() → Target Set → Reactive Updates
```

Cydon's core process consists of three phases:

1. **Compilation Phase** (`compile()`): Traverses the DOM tree, identifies directives and interpolation expressions, and generates compilation products `Results`.
2. **Binding Phase** (`bind()`): Traverses the compilation products, binds each `Part` to a specific DOM node, and creates reactive `Target`s.
3. **Update Phase** (`update()` → `commit()`): When data changes, batch-updates all affected nodes via microtasks.

## Compilation Principles

## Core Object Definitions

### Part and Target

Cydon distinguishes two core concepts:

- **Part**: The product of the compilation phase, representing a mutable part. It describes "which properties need to be updated when changed" and "how to update" (contains the template function `f` and dependency set `deps`).
- **Target**: The product after binding, representing an updatable target (Part + specific DOM node + reactive data context).

```ts
type Part = {
    a?: string      // Attribute name (attribute binding), empty for text node
    deps?: Dep      // Dependency set
    f(data, el): any // Template render function
}

type Target = Part & {
    n: Element | Text  // Bound DOM node
    deps: Dep          // Overwritten as required
    x: Data            // Reactive data context (proxy)
}
```

`Target` is created via `Object.create(part)`, using Part as the prototype — this allows a Part to be shared by multiple nodes (e.g., iteration items of the same template in `c-for`).

### Compilation Flowchart

```txt
┌───────────────────────────────────────────────────┐
│             compile(results, el)                  │
│                                                   │
│ DOM Root                                          │
│   │                                               │
│   ├─→ Traverse element attributes                 │
│   │    ├─ c-for? → Recursively compile template → Result[] │
│   │    ├─ Directive match? → DirectiveHandler → Directive │
│   │    └─ Interpolation parse? → parse() → Part    │
│   │                                               │
│   ├─→ Shadow Root? → Recursively compile → Result[]│
│   │                                               │
│   └─→ Traverse child nodes                        │
│        ├─ Element → Recursively compile(results, child) │
│        └─ Text → parse() → Part | null             │
│                                                   │
│  Output: results = [index, result, index, result, ...]│
└────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────┐
│             bind(results, el)                    │
│                                                  │
│ Traverse results                                 │
│   │                                              │
│   ├─ number → Bitwise decode → Locate DOM node  │
│   │                                              │
│   ├─ AttrMap → Call bindNode() for each Part     │
│   │                                              │
│   ├─ Result[] (c-for) → for_() pooled rendering  │
│   │                                              │
│   ├─ Result[] (shadow) → Bind Shadow Root        │
│   │                                              │
│   └─ Part → bindNode() → Create Target           │
│                             ├─ Proxy dependency collection │
│                             ├─ Add to $targets set │
│                             └─ update() first render │
└──────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────┐
│                 Reactive Updates                   │
│                                                    │
│ data.prop = newVal                                 │
│   │                                                │
│   ├─ Proxy.set intercept                           │
│   ├─ updateValue(prop) → add to $queue             │
│   ├─ queueMicrotask(commit)                        │
│   │                                                │
│   └─ commit()                                      │
│        ├─ Traverse $targets                        │
│        ├─ Check deps ∩ $queue                      │
│        ├─ update(target) → dirty check → DOM update│
│        └─ Clear $queue                             │
└─────────────────────────────────────────────────────┘
```

### Template Parsing

Cydon's template parsing uses a **runtime compilation** strategy — it directly traverses the real DOM tree in the browser, rather than compiling template strings into a virtual DOM or render functions.

Interpolation expression parsing is done by the `parse()` function. For text like `Hello $name, you have ${count} items`, the regex `/\$([_a-z][\w.]*|\{.+?\})/is` splits it into a token array:

```
["Hello ", "name", ", you have ", "{count}", " items"]
```

It is then reconstructed into an executable template literal function:

```js
function($e) { with(this) { return `Hello ${this.name}, you have ${count} items` } }
```

Key design decisions:
- Using `with(this)` allows the template function to directly access properties on `this` (i.e., the Cydon instance's `$data`).
- The `$e` parameter represents the currently bound DOM element (passed in via `f.call(data, el)`).
- Functions are cached via `toFunction()` to avoid repeated construction.

### Results Data Structure

The compilation product `Results` is a flat array that alternates between **node indices** and **compilation results**:

```ts
type Results = (AttrMap | Part | Result | number)[]
```

Element types in the array:

| Element Type | Meaning |
|--------------|---------|
| `number` | Node position marker, high 10 bits encode nesting depth, low 22 bits encode sibling index |
| `AttrMap` | The set of attribute/directive bindings on the element |
| `Part` | A single dynamic part, such as text node interpolation |
| `Result` (array) | A substructure (Shadow DOM or `c-for` loop) |

#### Node Index Encoding

Cydon uses a 32-bit integer to simultaneously encode the **nesting depth** and **sibling index** of a DOM node:

```
┌──────────┬────────────────────────┐
│  High 10 │        Low 22          │
│  level   │        index           │
└──────────┴────────────────────────┘
```

- `N = 22`: The index occupies the low 22 bits, supporting up to 4,194,303 sibling nodes per level.
- `level = result >>> 22`: Nesting depth (0-based), supporting up to 1024 levels of nesting.
- `index = result & 4194303`: Position among siblings.

This design avoids recursion or tree structures, allowing the `bind()` phase to use a simple linear loop:

```ts
for (let i = 1; i < results.length; ++i) {
    let result = results[i]
    if (typeof result == 'object') {
        // Handle binding
    } else {
        // Handle node position jump
        const level = result >>> 22
        result &= 4194303
        // Advance to the specified sibling
        for (; n < result; n++)
            node = node.nextSibling!
    }
}
```

The `bind()` method traverses the flat `Results` array, maintaining a **node pointer** and a **level stack** to reconstruct the DOM traversal path:

**Core Approach**:

- Level increases → enter child node (`firstChild`), push current offset onto stack
- Level decreases → return to parent node (`parentNode`), pop and restore offset
- Same level → move to target offset via `nextSibling`

### Shadow DOM Handling

When an element has a `shadowRoot`, Cydon recursively compiles it as a child `Result`. During the binding phase, if the Shadow Root has not been created yet, it automatically calls `attachShadow({ mode: 'open' })` and clones the child nodes.

### textarea and Cydon Elements Skipping

During compilation, Cydon skips the child content of `<textarea>` or Custom Elements that define an `updateValue` method on their prototype — because these are managed by the browser or the component itself.

## Reactive System

### Data Proxy

Cydon uses `Proxy` to implement reactive data. The `setData()` function creates a proxy for the data object:

```ts
proxy = {
    get: (obj, key) => obj[key],
    set(obj, key, val, receiver) {
        const hasOwn = Object.hasOwn(obj, key)
        if (hasOwn && val === obj[key])
            return true  // Value unchanged, skip

        // Scope fallback logic
        const r = parent && !hasOwn && receiver === cydon.data ?
            Reflect.set(parent, key, val) :
            Reflect.set(obj, key, val, receiver)
        cydon.updateValue(key)  // Trigger update
        return r
    }
}
```

### Scope Chain

Cydon supports **nested scopes**. When setting a non-existent property in a child scope, it automatically falls back to the parent scope. This is mainly used for:
- Each iteration item in a `c-for` loop can access outer data.
- When components are nested, child components can access parent component data.

The condition `receiver === cydon.data` ensures fallback only happens when setting through the current instance's `data` proxy.

### Dependency Tracking

Dependency tracking happens during the binding phase. `bindNode()` creates a read proxy for each `Part` that has `deps`:

```ts
proxy = {
    get(obj, key, receiver) {
        if (typeof key == 'string')
            deps.add(key)  // Automatically collect dependencies
        return Reflect.get(obj, key, receiver)
    }
}
```

When the template function `f` reads properties through `target.x` (the proxy data), all accessed keys are automatically collected into the `deps` set. This implements **zero-configuration automatic dependency tracking** — no explicit declarations like `computed` or `watch` are needed.

### Batched Async Updates

`updateValue(prop)` does not immediately update the DOM. Instead, it puts the changed property into `$queue`:

```ts
updateValue(prop: string) {
    if (!this.$queue.size)
        queueMicrotask(() => this.commit())
    this.$queue.set(prop, 1)
}
```

`commit()` executes in a microtask, traversing all `$targets` and only updating nodes whose dependencies have changed. The `$limits` field restricts the maximum number of updates for a single property in one commit, preventing infinite loops.

### Update Granularity

Updates are at the `Target` level — each `Target` corresponds to a specific DOM node (text node or element attribute). A **dirty check** is performed before updating:

```ts
// Text node
val = f.call(data, el)
return val != node.data && (node.data = val, true)

// Element attribute
val = f.call(data, el)
return a && val != el.getAttribute(a) && !el.setAttribute(a, val)
```

The DOM is only updated when the new value differs from the current value, avoiding unnecessary reflows.

## Directive System

### Pluggable Design

The directive handler is a function array `DirectiveHandler[]`, matched in order during compilation:

```ts
type DirectiveHandler = (
    name: string,      // Attribute name, e.g. 'c-if'
    value: string,     // Attribute value, e.g. 'show'
    el: Element,       // Current element
    attrs: AttrMap,    // Current element's attribute binding set
    parent?: ParentNode // Parent node in c-for
) => Directive | void
```

Built-in directives are exported as the array `directives` in `directives/index.ts`. Users can extend or replace the directive set via the `$directives` property.

### c-for List Rendering

`c-for` is the most complex directive. Its core mechanism:

1. **Compilation**: Identifies `<template c-for="item, index; list">`, compiles the `<template>` content as a template, and removes the `<template>` element itself from the DOM.
2. **Binding**: Creates a proxy for the array, intercepting `length` setting and index writes.
3. **Each iteration item**: Creates an independent Cydon child context (`Object.create(cydon)`) with its own `$data` and scope chain.
4. **setCapacity(n)**: Dynamically adds or removes DOM nodes based on array length. Removed nodes are cleaned up lazily via `requestIdleCallback`.

```ts
// Key interception of the array proxy
const handler = {
    set(obj, p, val) {
        if (p == 'length')
            setCapacity(obj.length = +val)
        else {
            obj[p] = val
            if (typeof p == 'string' && +p == p)
                render(+p) // Update the DOM for the corresponding index
        }
    }
}
```

### c-model Two-way Binding

`c-model` handles the following edge cases:

- **IME Input**: By listening to `compositionstart/compositionend` events, it avoids triggering updates during IME composition (e.g., typing Chinese pinyin).
- **Type Inference**: If the getter returns `number`, the setter automatically converts with `+newVal`.
- **Different Form Elements**: `<select multiple>`, `radio`, `checkbox` each have specialized value retrieval logic.
- **Lazy Mode**: `c-model.lazy` uses the `change` event instead of `input`.

### c-if / c-show Conditional Rendering

- **c-show**: Only toggles the `display` style; the initial value is saved for restoration.
- **c-if**: Uses a `Comment` node as a placeholder, `el[lastValue]` tracks the current state to avoid duplicate operations, and calls `mount/unmount` lifecycle methods when toggling.

## Component Model

### Mixin Pattern

Cydon uses Mixin rather than inheritance for feature composition:

```ts
export const CydonOf = <T extends {}>(base: Ctor<T> = Object) => {
    class Mixin extends base {
        // Reactive capabilities
    }
    return Mixin
}
```

This means you can mix Cydon's reactive capabilities into **any base class** — `HTMLElement`, `HTMLDialogElement`, or even a plain `Object`:

```ts
// As a standalone instance
const app = new Cydon({ count: 0 })
app.mount(document.body)

// Mixed into a Custom Element
class MyDialog extends CydonOf(HTMLDialogElement) { ... }
```

### Web Components Integration

- The `define` decorator wraps `customElements.define`, supporting both TypeScript native decorators and TC39's `context.addInitializer`.
- Shadow DOM is automatically recognized and recursively compiled.

### Lifecycle

Cydon does not have explicit lifecycle hooks (like `onMount`, `onDestroy`), but provides:

- `mount(container)`: Compile + bind.
- `unmount(el?)`: Cleans up Targets in the specified container, or cleans up all disconnected nodes.
- `connectedCallback()`, etc.: Provided by the Custom Element specification.

## Comparison with Similar Frameworks

| Feature | Cydon | Vue | React |
|---------|-------|-----|-------|
| Runtime Size | ~3KB | ~33KB | ~45KB |
| Reactivity Mechanism | Proxy + automatic dependency tracking | Proxy + effect system | Immutable state + re-render |
| Template Compilation | Compiles real DOM directly | Compiles template string → VNode | JSX → VNode |
| DOM Update | Precise Target dirty check | VNode Diff + Patch | VNode Diff + Reconciliation |
| Component Model | Mixin + Web Components | Options/Composition API | Hooks + Function Components |
| Dependencies | Zero external dependencies | Has dependencies | Has dependencies |

Cydon's position is an **ultra-lightweight, native-first** reactive framework for Web Components. It does not pursue a large and comprehensive ecosystem, but instead provides the most essential reactive binding capabilities, leaving the rest to the browser's native standards.

## Design Constraints and Trade-offs

### Limitations of Bitwise Level Encoding

The `N=22` encoding scheme limits a single level to about 4.2 million sibling nodes at most, which is more than sufficient for the vast majority of scenarios.

### No Virtual DOM

Cydon does not perform Virtual DOM diffing. This brings extreme lightness, but also means:
- Cross-platform rendering is limited (cannot render to Native like React).
- No scheduling optimizations like "time slicing".
- Update granularity is at the node level; no batch patching.

### Compilation and Runtime Coupling

Cydon's compilation process directly manipulates the real DOM, which means:
- It works without any build tools.
- But templates must be valid HTML (cannot directly put custom components inside `<table>`, etc.).
- SSR requires additional handling.