# Events

## Event Binding

Attributes starting with `@` are used to bind events, for example:

```stylus
button[@click="alert('Hello')"]{Click me}
```

The attribute value can be a method name or an expression. If no corresponding method exists, it is treated as an expression.

In inline expressions, `$e` refers to the Event object, and the expression is executed in a `with(this)` context.

When the expression is too long, it can be placed as a method in the custom element class. The attribute value is the method name, and the first argument of the method is the event object.

```stylus
my-element
    {$msg}
    button[@click=func]{Click me}
```

```ts
@define('my-element')
class MyElement extends CydonElement {
	msg = ''

	func(e: Event) {
        // `this` here is a Proxy object, so all changes to `this` will be synced to the DOM
        this.msg = 'OK'
    }
}
```

## Event Delegation

Cydon uses event delegation by default to optimize performance. For non-`capture`, non-`once`, and non-`$` dynamic events, event listeners are delegated to the root node (Document or ShadowRoot) rather than being bound directly to each element.

How event delegation works:
1. A unified event listener is added to the root node.
2. When an event fires, it traverses upward from `event.target` to find the element that has a matching event handler bound.
3. Once found, the corresponding handler is called, and upward traversal stops.

This mechanism reduces the number of event listeners, which is especially beneficial for scenarios with large numbers of elements, such as lists.

## Event Modifiers

Modifiers are separated by `.` and follow the event name. Multiple modifiers can be used together:

```stylus
button[@click.capture.once]{Trigger only once}
```

| Modifier | Description |
| --- | --- |
| `.away` | The handler only executes when the event is triggered from outside the element. Useful for scenarios like clicking outside to close a modal. |
| `.capture` | Adds the event listener in the capture phase. Event delegation is not used with this modifier. |
| `.once` | The handler is triggered at most once and is automatically removed after triggering. Event delegation is not used with this modifier. |
| `.passive` | Attaches the DOM event with `{ passive: true }`, used for optimizing performance of high-frequency events like scrolling. |

### .away Example

```stylus
.dialog[@click.away=close]
  {Content}
```

The `close` method is only called when clicking outside `.dialog`.

## Dynamic Event Names

Event names can also be dynamic, starting with `@$`. The event name is obtained from the data object, but is only evaluated once at bind time:

```stylus
button[@$evt="alert('Hello')"]{Click me}
```

```ts
@define('my-element')
class MyElement extends CydonElement {
	evt = 'click'
}
```

## EventOf

`EventOf` is an independent event system that does not depend on the DOM and can be used for component communication:

```ts
import { EventOf } from 'cydon'

const eventHub = new EventOf()

// Listen for events
eventHub.on('change', (value) => {
  console.log('changed:', value)
})

// Emit events
eventHub.emit('change', 42)

// Remove a specific listener
const handler = (value) => console.log(value)
eventHub.on('change', handler)
eventHub.off('change', handler)

// Remove all listeners for a specific event
eventHub.off('change')

// Clear all event listeners
eventHub.off()
```

`EventOf` can also be used in combination with a base class:

```ts
import { EventOf } from 'cydon'

class MyClass extends EventOf() {
  doSomething() {
    this.emit('done', result)
  }
}
```

## composing

`c-model` internally uses `composing` (`WeakSet<EventTarget>`) to track elements that are currently using IME composition. During composition input (e.g., Chinese input method), `c-model` does not trigger data updates; updates only happen after composition is complete.

This set is exported, and custom directives can also use it to handle similar IME composition scenarios:

```ts
import { composing } from 'cydon'
```