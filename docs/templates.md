# 模板

## 文本插值

最基本的数据绑定形式是文本插值，由一个`$`开头，后跟变量名，变量名只能包含大小写字母、数字、下划线和点，且不能以数字开头，其中点（`.`）用于访问属性

例如：`span{$value}`，`input[type=text value=$value]`，`$item.name`

`$value`等价于`${this.value}`，文本插值不应该有副作用

## 表达式插值

由一个`$`开头，后跟一对大括号包围的表达式，例如：`${n*2}`，`${value()}`

表达式中的this指向data对象，`$e`指向表达式所在的元素，在事件绑定的表达式中`$e`指向事件对象，表达式将在`with(this)`上下文中执行

类似Vue中的computed，表达式不应有副作用

## 属性插值

HTML标签属性中的文本插值会被替换为属性值，若属性值不是字符串，则转换为字符串形式：

```html
<div class="$className">内容</div>
<input type="text" value="$msg">
<img src="$imageUrl">
```

当属性值包含多个插值或混合文本时，会使用模板字符串进行拼接：

```html
<div class="container $size">内容</div>
<!-- 等价于 class = `container ${this.size}` -->
```

## 编译过程

Cydon的模板编译分为两个阶段：

1. **编译阶段**（`compile`）：遍历DOM树，收集所有包含插值表达式和指令的节点，生成编译结果（`Results`）
2. **绑定阶段**（`bind`）：根据编译结果，为每个可变部分创建`Target`对象，建立数据与DOM的响应式关系

编译阶段会从DOM中移除指令属性（除非设置了`keep: true`），除此之外不会修改其余DOM结构。绑定阶段会立即执行一次更新函数，将数据渲染到DOM中。

## 依赖追踪

Cydon使用`Proxy`实现依赖追踪：

1. 当绑定一个节点时，创建一个`Dep`（`Set<string>`）集合来记录依赖
2. 通过`Proxy`的`get`陷阱，在更新函数执行时自动收集被访问的属性名
3. 当属性值发生变化时，通过`updateValue`将属性名加入更新队列
4. 在`commit`阶段，遍历所有`Target`，检查其依赖是否在更新队列中，若在则重新执行更新函数

一个简化版的依赖追踪的Proxy实现原理示例如下
```ts
const proxy = {
    get(obj, key, receiver) {
        if (typeof key == 'string') deps.add(key) // 收集依赖
        return Reflect.get(obj, key, receiver)
    }
}
```

## 更新机制

Cydon采用异步批量更新机制：

1. 修改`data`属性时，通过Proxy的`set`陷阱调用`updateValue`
2. `updateValue`将属性名加入`$queue`，若加入前队列为空，则通过`queueMicrotask`调度一次`commit`
3. `commit`在微任务中执行，遍历所有`Target`，更新依赖发生变化的节点
4. 可通过`$limits`字段设置每个属性在单次`commit`中的更新次数限制，防止无限循环

```ts
app.data.count = 1  // 加入队列
app.data.msg = 'hello'  // 加入队列
// 微任务执行时，一次性更新所有变化的DOM
```

## 数据代理

Cydon实例有两个数据对象：

- **`$data`**：原始数据对象，直接修改不会触发DOM更新
- **`data`**：响应式代理对象，修改属性会自动触发DOM更新

当在`data`上设置一个当前作用域不存在的属性时，如果存在`parent`作用域，则会回退到父级作用域设置该属性。这在`c-for`中尤为重要，子项的数据会继承父级的数据。

## Shadow DOM

Cydon支持Shadow DOM中的模板编译。当元素拥有Shadow Root时，编译器会自动进入Shadow Root内部编译模板：

```html
<template shadowrootmode="open">
    <style>/* 局部样式 */</style>
    <span>$msg</span>
</template>
```

Shadow Root中的模板与外部模板使用相同的编译和绑定机制。

## 注意

1. HTML标签属性中的文本插值会被替换为属性值，若属性值不是字符串，则转换为字符串形式
2. 文本节点中的插值以文本形式插入，而不是HTML，这可以防止XSS攻击
3. 标签名和属性名不支持插值，例如`<$elName>`和`<p $attr="xxx">`都是不能识别的
4. 若文本插值的对应属性不存在，则原样输出
5. `<textarea>`元素内容不支持插值表达式，请使用`c-model`或`.value`属性绑定
6. 包含Cydon实例的自定义元素（通过`customElements.define`注册的）和`<textarea>`的子节点不会被编译
