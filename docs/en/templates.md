# Templates

## Text Interpolation

The most basic form of data binding is text interpolation. It starts with a `$` followed by a variable name. Variable names can only contain letters, numbers, underscores, and dots, and cannot start with a number. The dot (`.`) is used to access properties.

For example: `span{$value}`, `input[type=text value=$value]`, `$item.name`

`$value` is equivalent to `${this.value}`. Text interpolation should not have side effects.

## Expression Interpolation

Starts with a `$` followed by a pair of curly braces containing an expression. For example: `${n*2}`, `${value()}`.

In expressions, `this` points to the data object, and `$e` points to the element where the expression is located. In event binding expressions, `$e` points to the event object. Expressions are executed in a `with(this)` context.

Similar to Vue's computed properties, expressions should not have side effects.

## Attribute Interpolation

Text interpolation in HTML tag attributes is replaced with the attribute value. If the attribute value is not a string, it is converted to string form:

```html
<div class="$className">Content</div>
<input type="text" value="$msg">
<img src="$imageUrl">
```

When an attribute value contains multiple interpolations or mixed text, template strings are used for concatenation:

```html
<div class="container $size">Content</div>
<!-- Equivalent to class = `container ${this.size}` -->
```

## Compilation Process

Cydon's template compilation consists of two phases:

1. **Compilation Phase** (`compile`): Traverses the DOM tree, collects all nodes containing interpolation expressions and directives, and generates compilation results (`Results`).
2. **Binding Phase** (`bind`): Creates `Target` objects for each mutable part based on the compilation results, establishing the reactive relationship between data and DOM.

During the compilation phase, directive attributes are removed from the DOM (unless `keep: true` is set). No other modifications are made to the DOM structure. During the binding phase, the update function is executed once immediately to render the data into the DOM.

## Dependency Tracking

Cydon uses `Proxy` to implement dependency tracking:

1. When binding a node, a `Dep` (`Set<string>`) set is created to record dependencies.
2. Through the `Proxy`'s `get` trap, accessed property names are automatically collected while the update function runs.
3. When a property value changes, the property name is added to the update queue via `updateValue`.
4. In the `commit` phase, all `Target`s are traversed to check if their dependencies are in the update queue. If so, the update function is re-executed.

A simplified example of the Proxy-based dependency tracking implementation:

```ts
const proxy = {
    get(obj, key, receiver) {
        if (typeof key == 'string') deps.add(key) // Collect dependencies
        return Reflect.get(obj, key, receiver)
    }
}
```

## Update Mechanism

Cydon uses an asynchronous batched update mechanism:

1. When modifying a `data` property, the `Proxy`'s `set` trap calls `updateValue`.
2. `updateValue` adds the property name to `$queue`. If the queue was empty before adding, a `commit` is scheduled via `queueMicrotask`.
3. `commit` executes in a microtask, traversing all `Target`s and updating nodes whose dependencies have changed.
4. The `$limits` field can be used to set the maximum number of updates per property in a single `commit`, preventing infinite loops.

```ts
app.data.count = 1  // Added to queue
app.data.msg = 'hello'  // Added to queue
// When the microtask executes, all changed DOM nodes are updated at once
```

## Data Proxy

A Cydon instance has two data objects:

- **`$data`**: The raw data object. Direct modification does not trigger DOM updates.
- **`data`**: The reactive proxy object. Modifying properties automatically triggers DOM updates.

When setting a property that does not exist in the current scope on `data`, if a `parent` scope exists, it falls back to setting the property in the parent scope. This is especially important in `c-for`, where child items inherit data from the parent.

## Shadow DOM

Cydon supports template compilation inside Shadow DOM. When an element has a Shadow Root, the compiler automatically enters the Shadow Root to compile templates:

```html
<template shadowrootmode="open">
    <style>/* Scoped styles */</style>
    <span>$msg</span>
</template>
```

Templates in the Shadow Root use the same compilation and binding mechanism as external templates.

## Notes

1. Text interpolation in HTML tag attributes is replaced with the attribute value. If the attribute value is not a string, it is converted to string form.
2. Interpolation in text nodes is inserted as text, not HTML. This prevents XSS attacks.
3. Tag names and attribute names do not support interpolation. For example, `<$elName>` and `<p ${attr}="xxx">` are not recognized (but `$attr` is a supported dynamic attribute name directive, see [Directives](./directives.md)).
4. If the corresponding property for a text interpolation does not exist, it is output as-is.
5. Interpolation expressions are not supported inside `<textarea>`. Use `c-model` or `.value` property binding instead.
6. Child nodes of Custom Elements registered via `customElements.define` that contain Cydon instances, as well as `<textarea>`, are not compiled.