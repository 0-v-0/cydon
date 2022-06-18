# cydon

轻量级响应式框架

## 特点
- 轻量
- 无VDOM
- 单向/双向绑定
- 支持`computed`属性
- 支持自定义指令

## Known issues
- 在Cydon绑定过的元素上(通过`Cydon.bind`)调用`Node.normalize()`可能会出现问题