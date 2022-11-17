# 事件

## 事件绑定
以`@`开头的属性用于绑定事件，例如：
```stylus
button[@click="alert('Hello')"]{Click me}
```

当表达式太长时，可以作为方法放到自定义元素类中，方法的第一个参数为事件对象
```stylus
my-element
    {$msg}
    button[@click=func]{Click me}
```
```ts
@define('my-element')
class MyElement extends CydonElement {
	msg = ''

	func(evt: Event) {
        // 这里的this其实是一个Proxy对象，因此所有对this所作的更改将会同步到DOM中
        this.msg = 'OK'
        // 不能在这里直接调用基类的某些方法，否则会抛出非法调用的异常，应当使用evt.target访问真正的this
        // this.focus()
    }
}
```

事件名称也可以是动态的，但只会在绑定时计算一次，例如：
```stylus
button[@$evt="alert('Hello')"]{Click me}
```
```ts
@define('my-element')
class MyElement extends CydonElement {
	evt = 'click'
}
```
