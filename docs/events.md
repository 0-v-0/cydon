# 事件

## 事件绑定
以`@`开头的属性用于绑定事件，例如：
```stylus
button[@click="alert('Hello')"]{Click me}
```

属性值可以为方法名或表达式，若不存在对应方法，则视为表达式

内联表达式中`$e`指向Event对象，表达式将在`with(this)`上下文中执行

当表达式太长时，可以作为方法放到自定义元素类中，属性值为方法名，方法的第一个参数为事件对象
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
        // 这里的this为Proxy对象，因此所有对this所作的更改将会同步到DOM中
        this.msg = 'OK'
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
