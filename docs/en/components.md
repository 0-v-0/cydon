# Component Lifecycle

Cydon is based on Web Components, and the component lifecycle follows the Web Components specification.

- `constructor`: Executed when the component is created, runs only once in the entire lifecycle.
- `attributeChangedCallback(name, oldVal, newVal)`: Executed when a watched attribute changes. This function runs before `connectedCallback`.
  - `name`: Attribute name
  - `oldVal`: Old attribute value; `null` on first call or when the attribute is newly added
  - `newVal`: New attribute value; `null` when the attribute is removed
- `connectedCallback()`: Executed when the component is added to the document.
- `disconnectedCallback()`: Executed when the component is removed from the document.
- `adoptedCallback()`: Executed when the component is moved to a new document.

When the component is moved to another document, the execution order is: `disconnectedCallback` → `adoptedCallback` → `connectedCallback`.

## Lifecycle Flow

```
Create instance → constructor
                  ↓
Add to DOM → attributeChangedCallback (if attributes have initial values)
                  ↓
              connectedCallback
                  ↓
              mount() → compile → bind (automatic)
                  ↓
              Component running...
                  ↓
Remove from DOM → disconnectedCallback
```

## Notes

### attributeChangedCallback Notes
Cydon component initialization happens in the `connectedCallback` phase, which runs after `attributeChangedCallback`. If the attribute value contains interpolation expressions, the `newVal` parameter in the first `attributeChangedCallback` call will be the unrendered attribute value, and `oldVal` will be `null`.

### mount Notes
Do not call `this.mount()` in the `constructor`, because the DOM of child elements may not be fully loaded, causing child elements to not be bound to reactive data. `mount()` must be called after the child element DOM is fully loaded (e.g., after `connectedCallback` is triggered).

## Reference

[Custom elements (javascript.info)](https://javascript.info/custom-elements#rendering-order)

# Component Communication

## Communication via eventHub

This approach works for any component (including native Web Components).

```ts
import { EventOf } from 'cydon'

const eventHub = new EventOf()

@define('comp-a')
export class CompA extends CydonElement {
    count = 0

    add() {
        this.count++
        eventHub.emit('countChanged', count)
    }
}

@define('comp-b')
export class CompB extends CydonElement {
    countChanged(count: number) {
        console.log('count: ' + count)
    }

    connectedCallback() {
        eventHub.on('countChanged', this.countChanged)
        super.connectedCallback()
    }

    disconnectedCallback() {
        eventHub.off('countChanged', this.countChanged)
    }
}
```

> **Tip**: Register event listeners in `connectedCallback` and remove them in `disconnectedCallback` to avoid memory leaks.

## Parent to Child Data Passing

1. **Via events**: The parent sends events via `emit`, and the child listens via `on`. Any type of argument can be passed.

2. **Via props**: Pass data through property binding in EMT templates. Any type of argument can be passed.

   ```stylus
   x-parent
     x-children[.prop=x]
   ```

   Access in the child component via `this.prop` or `$prop`.

3. **Via DOM attributes**: Set HTML attributes, the child receives them via `attributeChangedCallback`. This method can only pass string-type arguments.

   ```stylus
   x-parent
     x-children[attr=x]
   ```

## Child to Parent Data Passing

1. **Via events**: The child sends events via `emit`, and the parent listens via `on`, or uses DOM event bubbling.
2. **Via object properties or methods**: Directly access the parent component's DOM object properties or methods.

   ```ts
   // In child component
   const parent = this.parentElement
   parent.someMethod(data)
   ```

## Cross-level Communication

For cross-level component communication, it is recommended to use `EventOf` to create a global event hub:

```ts
// event-bus.ts
import { EventOf } from 'cydon'
export const eventBus = new EventOf()

// In any component
import { eventBus } from './event-bus'
eventBus.emit('globalEvent', data)
eventBus.on('globalEvent', handler)
```