# 设计原理

本文档深入阐述 Cydon 框架的核心设计原理，涵盖编译、响应式、绑定、指令系统和组件模型等方面，帮助读者理解 Cydon 是如何工作的，以及为什么这样设计。

## 设计哲学

Cydon 的设计遵循以下核心理念：

- **极简至上**：核心代码约 400 行 TypeScript，无任何外部运行时依赖
- **原生优先**：基于 Web Components 标准，充分利用浏览器原生能力（Proxy、Custom Elements、Shadow DOM）
- **声明式模板**：模板语法贴近 HTML 原生写法，`$var` 插值和属性指令直观易懂
- **按需扩展**：通过 Mixin 模式和可插拔指令系统，按需组合功能，避免引入不必要的代码

## 整体架构

```
DOM 树 ──compile() → Results[] ──bind() → Target 集合 → 响应式更新
```

Cydon 的核心流程分为三个阶段：

1. **编译阶段**（`compile()`）：遍历 DOM 树，识别指令和插值表达式，生成编译产物 `Results`
2. **绑定阶段**（`bind()`）：遍历编译产物，将每个 `Part` 与具体 DOM 节点绑定，创建响应式 `Target`
3. **更新阶段**（`update()` → `commit()`）：数据变更时，通过微任务批量更新所有受影响的节点

## 编译原理

## 核心对象定义

### Part 与 Target

Cydon 区分两个核心概念：

- **Part**：编译阶段的产物，表示可变部分，描述"哪些属性变化时需要更新"和"如何更新"（包含模板函数 `f` 和依赖集 `deps`）
- **Target**：绑定后的产物，表示可更新的目标（Part + 具体 DOM 节点 + 响应式数据上下文）

```ts
type Part = {
    a?: string      // 属性名（属性绑定），空则为文本节点
    deps?: Dep      // 依赖集合
    f(data, el): any // 模板渲染函数
}

type Target = Part & {
    n: Element | Text  // 绑定的 DOM 节点
    deps: Dep          // 重写为必选
    x: Data            // 响应式数据上下文（代理）
}
```

`Target` 通过 `Object.create(part)` 创建，以 Part 为原型——这样 Part 可以被多个节点共享（如 `c-for` 中同模板的迭代项）。

### 编译流程图

```txt
┌───────────────────────────────────────────────────┐
│             compile(results, el)                  │
│                                                   │
│ DOM Root                                          │
│   │                                               │
│   ├─→ 遍历元素属性                                 │
│   │    ├─ c-for? → 递归编译 template → Result[]    │
│   │    ├─ 指令匹配? → DirectiveHandler → Directive │
│   │    └─ 插值解析? → parse() → Part               │
│   │                                               │
│   ├─→ Shadow Root? → 递归编译 → Result[]           │
│   │                                               │
│   └─→ 遍历子节点                                   │
│        ├─ 元素 → 递归 compile(results, child)      │
│        └─ 文本 → parse() → Part | null             │
│                                                   │
│ 输出: results = [index, result, index, result, ...]│
└────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────┐
│             bind(results, el)                    │
│                                                  │
│ 遍历 results                                     │
│   │                                              │
│   ├─ number → 位运算解码 → 定位 DOM 节点          │
│   │                                              │
│   ├─ AttrMap → 为每个 Part 调用 bindNode()        │
│   │                                              │
│   ├─ Result[] (c-for) → for_() 池化渲染           │
│   │                                              │
│   ├─ Result[] (shadow) → 绑定 Shadow Root        │
│   │                                              │
│   └─ Part → bindNode() → 创建 Target              │
│                             ├─ Proxy 依赖收集     │
│                             ├─ 加入 $targets 集合 │
│                             └─ update() 首次渲染  │
└──────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────┐
│                   响应式更新                        │
│                                                    │
│ data.prop = newVal                                 │
│   │                                                │
│   ├─ Proxy.set 拦截                                │
│   ├─ updateValue(prop) → 加入 $queue               │
│   ├─ queueMicrotask(commit)                        │
│   │                                                │
│   └─ commit()                                      │
│        ├─ 遍历 $targets                            │
│        ├─ 检查 deps ∩ $queue                       │
│        ├─ update(target) → 脏检查 → DOM 更新        │
│        └─ 清空 $queue                               │
└─────────────────────────────────────────────────────┘
```

### 模板解析

Cydon 的模板解析采用**运行时编译**策略——直接在浏览器中遍历真实 DOM 树，而非将模板字符串编译为虚拟 DOM 或渲染函数。

插值表达式的解析由 `parse()` 函数完成。对于文本如 `Hello $name, you have ${count} items`，正则 `/\$([_a-z][\w.]*|\{.+?\})/is` 会将其拆分为 token 数组：

```
["Hello ", "name", ", you have ", "{count}", " items"]
```

然后重构成可执行的模板字面量函数：

```js
function($e) { with(this) { return `Hello ${this.name}, you have ${count} items` } }
```

关键设计决策：
- 使用 `with(this)` 使得模板函数内部可以直接访问 `this` 上的属性（即 Cydon 实例的 `$data`）
- `$e` 参数代表当前绑定的 DOM 元素（在 `f.call(data, el)` 中传入）
- 函数通过 `toFunction()` 缓存，避免重复构造

### Results 数据结构

编译产物 `Results` 是一个扁平数组，交替存储**节点索引**和**编译结果**：

```ts
type Results = (AttrMap | Part | Result | number)[]
```

数组中的元素类型：

| 元素类型 | 含义 |
|----------|------|
| `number` | 节点位置标记，高 10 位编码层级深度，低 22 位编码兄弟索引 |
| `AttrMap` | 该元素上绑定的属性/指令集合 |
| `Part` | 单个动态部分，如文本节点的插值 |
| `Result` (数组) | 子结构（Shadow DOM 或 `c-for` 循环） |

#### 节点索引编码

Cydon 用一个 32 位整数同时编码 DOM 节点的**层级深度**和**同级索引**：

```
┌──────────┬────────────────────────┐
│  高10位  │        低22位          │
│  level   │        index           │
└──────────┴────────────────────────┘
```

- `N = 22`：索引占低 22 位，支持单层最多 4,194,303 个兄弟节点
- `level = result >>> 22`：层级深度（0-based），支持最多 1024 层嵌套
- `index = result & 4194303`：同级中的位置

这种设计避免了递归或树形结构，使得 `bind()` 阶段可以用简单的线性循环遍历：

```ts
for (let i = 1; i < results.length; ++i) {
    let result = results[i]
    if (typeof result == 'object') {
        // 处理绑定
    } else {
        // 处理节点位置跳转
        const level = result >>> 22
        result &= 4194303
        // 前进到指定兄弟节点
        for (; n < result; n++)
            node = node.nextSibling!
    }
}
```


`bind()` 方法遍历扁平的 `Results` 数组，通过维护一个**节点指针**和**层级栈**来重建 DOM 遍历路径：

**核心思路**：

- 层级增加 → 进入子节点（`firstChild`），当前偏移压栈
- 层级减少 → 回到父节点（`parentNode`），弹出恢复偏移
- 层级相同 → 通过 `nextSibling` 移动到目标偏移

### Shadow DOM 处理

当元素含有 `shadowRoot` 时，Cydon 会将其作为子 `Result` 递归编译。绑定阶段如果发现 Shadow Root 尚未创建，会自动调用 `attachShadow({ mode: 'open' })` 并克隆子节点。

### textarea 和 Cydon 元素跳过

编译时遇到 `<textarea>` 或原型上定义了 `updateValue` 方法的 Custom Element，Cydon 会跳过其子内容——因为它们由浏览器或组件自身管理。

## 响应式系统

### 数据代理

Cydon 使用 `Proxy` 实现响应式数据。`setData()` 函数为数据对象创建代理：

```ts
proxy = {
    get: (obj, key) => obj[key],
    set(obj, key, val, receiver) {
        const hasOwn = Object.hasOwn(obj, key)
        if (hasOwn && val === obj[key])
            return true  // 值未变，跳过

        // 作用域回退逻辑
        const r = parent && !hasOwn && receiver === cydon.data ?
            Reflect.set(parent, key, val) :
            Reflect.set(obj, key, val, receiver)
        cydon.updateValue(key)  // 触发更新
        return r
    }
}
```

### 作用域链

Cydon 支持**嵌套作用域**。当在子作用域中设置一个不存在的属性时，会自动回退到父作用域。这主要用于：
- `c-for` 循环中的每个迭代项可以访问外层数据
- 组件嵌套时子组件可访问父组件数据

判断条件 `receiver === cydon.data` 确保只有通过当前实例的 `data` 代理设置时才会回退。

### 依赖追踪

依赖追踪发生在绑定阶段。`bindNode()` 为每个带有 `deps` 的 `Part` 创建一个读取代理：

```ts
proxy = {
    get(obj, key, receiver) {
        if (typeof key == 'string')
            deps.add(key)  // 自动收集依赖
        return Reflect.get(obj, key, receiver)
    }
}
```

当模板函数 `f` 通过 `target.x`（即代理数据）读取属性时，所有被读取的 key 都被自动收集到 `deps` 集合中。这实现了**零配置的自动依赖追踪**——不需要 `computed`、`watch` 等显式声明。

### 批量异步更新

`updateValue(prop)` 不会立即更新 DOM，而是将变更的属性放入 `$queue`：

```ts
updateValue(prop: string) {
    if (!this.$queue.size)
        queueMicrotask(() => this.commit())
    this.$queue.set(prop, 1)
}
```

`commit()` 在微任务中执行，遍历所有 `$targets`，只更新那些依赖了变更属性的节点。通过 `$limits` 可以限制单个属性在一次提交中的最大更新次数，防止死循环。

### 更新粒度

更新以 `Target` 为单位——每个 `Target` 对应一个具体的 DOM 节点（文本节点或元素属性）。更新前会进行**脏检查**：

```ts
// 文本节点
val = f.call(data, el)
return val != node.data && (node.data = val, true)

// 元素属性
val = f.call(data, el)
return a && val != el.getAttribute(a) && !el.setAttribute(a, val)
```

只有当新值与当前值不同时才更新 DOM，避免不必要的重排。

## 指令系统

### 可插拔设计

指令处理器是一个函数数组 `DirectiveHandler[]`，编译时按顺序匹配：

```ts
type DirectiveHandler = (
    name: string,      // 属性名，如 'c-if'
    value: string,     // 属性值，如 'show'
    el: Element,       // 当前元素
    attrs: AttrMap,    // 当前元素的属性绑定集合
    parent?: ParentNode // c-for 中的父节点
) => Directive | void
```

内置指令在 `directives/index.ts` 中导出为数组 `directives`，用户可以通过 `$directives` 属性扩展或替换指令集。

### c-for 列表渲染

`c-for` 是最复杂的指令，其核心机制：

1. **编译时**：识别 `<template c-for="item, index; list">`，将 `<template>` 的内容作为模板编译，`<template>` 元素本身从 DOM 中移除
2. **绑定时**：为数组创建代理，拦截 `length` 设置和索引写入
3. **每个迭代项**：创建独立的 Cydon 子上下文（`Object.create(cydon)`），拥有自己的 `$data` 和作用域链
4. **setCapacity(n)**：根据数组长度动态增减 DOM 节点，移除的节点通过 `requestIdleCallback` 延迟清理

```ts
// 数组代理的关键拦截
const handler = {
    set(obj, p, val) {
        if (p == 'length')
            setCapacity(obj.length = +val)
        else {
            obj[p] = val
            if (typeof p == 'string' && +p == p)
                render(+p) // 更新对应索引的 DOM
        }
    }
}
```

### c-model 双向绑定

`c-model` 处理了以下边界情况：

- **IME输入**：通过监听 `compositionstart/compositionend` 事件，避免在 IME 组合输入期间（如输入中文拼音）触发更新
- **类型推断**：如果 getter 返回 `number`，setter 会自动 `+newVal` 转换
- **不同表单元素**：`<select multiple>`、`radio`、`checkbox` 各有专门的值获取逻辑
- **延迟模式**：`c-model.lazy` 使用 `change` 事件代替 `input`

### c-if / c-show 条件渲染

- **c-show**：仅切换 `display` 样式，初始值被保存以便恢复
- **c-if**：用 `Comment` 节点作为占位符，`el[lastValue]` 追踪当前状态避免重复操作，切换时调用 `mount/unmount` 生命周期

## 组件模型

### Mixin 模式

Cydon 使用 Mixin 而非继承来实现功能组合：

```ts
export const CydonOf = <T extends {}>(base: Ctor<T> = Object) => {
    class Mixin extends base {
        // 响应式能力
    }
    return Mixin
}
```

这意味着你可以将 Cydon 的响应式能力混入**任意基类**——`HTMLElement`、`HTMLDialogElement`，甚至是普通的 `Object`：

```ts
// 作为独立实例使用
const app = new Cydon({ count: 0 })
app.mount(document.body)

// 混入 Custom Element
class MyDialog extends CydonOf(HTMLDialogElement) { ... }
```

### Web Components 集成

- `define` 装饰器封装了 `customElements.define`，同时支持TypeScript原生装饰器和 TC39 的 `context.addInitializer`
- Shadow DOM 自动识别和递归编译

### 生命周期

Cydon 没有显式的生命周期钩子（如 `onMount`、`onDestroy`），但提供了：

- `mount(container)`：编译 + 绑定
- `unmount(el?)`：清理指定容器内的 Target，或清理所有已断开连接的节点
- `connectedCallback()`等：由 Custom Element 规范提供

## 与同类框架的对比

| 特性 | Cydon | Vue | React |
|------|-------|-----|-------|
| 运行时体积 | ~3KB | ~33KB | ~45KB |
| 响应式机制 | Proxy + 自动依赖追踪 | Proxy + effect 系统 | 不可变状态 + 重渲染 |
| 模板编译 | 直接编译真实 DOM | 编译模板字符串 → VNode | JSX → VNode |
| DOM 更新 | 精确 Target 脏检查 | VNode Diff + Patch | VNode Diff + Reconciliation |
| 组件模型 | Mixin + Web Components | 选项式/组合式 API | Hooks + 函数组件 |
| 依赖 | 零外部依赖 | 有依赖 | 有依赖 |

Cydon 的定位是一个**超轻量、原生优先**的 Web Components 响应式框架。它不追求大而全的生态系统，而是提供最核心的响应式绑定能力，其余交给浏览器原生标准。

## 设计约束与权衡

### 位运算层级编码的局限性

`N=22` 的编码方案限制了单层最多约 420 万个兄弟节点，但对于绝大多数场景绰绰有余。

### 无 Virtual DOM

Cydon 不做 Virtual DOM diff。这带来了极致的轻量，但也意味着：
- 跨平台的渲染能力受限（无法像 React 那样渲染到 Native）
- 没有"时间切片"等调度优化
- 更新粒度是节点级别，不能批量 patch

### 编译与运行时耦合

Cydon 的编译过程直接操作真实 DOM，这意味着：
- 无需构建工具即可工作
- 但模板必须是有效的 HTML（不能直接在 `<table>` 中放自定义组件等）
- SSR 需要额外处理
