# 组件间通信

## 通过eventHub通信
该方法适用于任何组件（对于原生的Web Components也适用）

```ts
import { EventOf } from 'cydon/events'
const eventHub = new EventOf()

@define('comp-a')
export class CompA extends CydonElement {
    count = 0

    add() {
        count++
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

## 父组件向子组件传递数据
1. 通过事件传递
2. 通过对象属性传递
3. 通过props传递

## 子组件向父组件传递数据
1. 通过事件传递
2. 通过对象属性传递