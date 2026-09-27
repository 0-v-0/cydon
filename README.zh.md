# Cydon

[![npm-v](https://img.shields.io/npm/v/cydon.svg)](https://npmjs.com/package/cydon)
[![npm-d](https://img.shields.io/npm/dt/cydon.svg)](https://npmjs.com/package/cydon)
[![brotli](http://img.badgesize.io/https://unpkg.com/cydon/dist/cydon.iife.js?compression=brotli&label=brotli)](https://bundlephobia.com/result?p=cydon)

用于构建快速、响应式 Web 组件的轻量级库。

## 特性
- 零依赖
- 无虚拟 DOM，组件本身即 DOM 元素
- 高性能且极致轻量：压缩并 brotli 后约 3kB
- 直观且所见即所得：使用基于 HTML 的模板语法
- 简洁：仅提供实现 Web 组件响应式所必需的最小化 API

## 预览
HTML：
```html
<my-pagination page="1">
    <template shadowrootmode="open">
        <style>
            button {
                padding: 0.3em;
            }
            .wrapper {
                display: flex;
                align-items: center;
            }
        </style>
        <!-- 监听回调 -->
        <div class="wrapper" :="console.log('当前页码为', page)">
            <!-- 事件绑定 -->
            <button @click="page--">上一页</button>
            <!-- 双向绑定 -->
            <select c-model="perPage" title="每页条数">
                <template c-for="n; perPages">
                    <!-- DOM 属性绑定、特性绑定与文本插值 -->
                    <option .selected="perPage == n" value="$n">$n</option>
                </template>
            </select>
            <span>
                每页
                <!-- 使用表达式进行文本插值 -->
                ${(page-1)*perPage+!!total}-${Math.min(page*perPage,total)} / $total
            </span>
            <button @click="page++">下一页</button>
        </div>
    </template>
</my-pagination>
```
TypeScript：
```ts
import { CydonElement, define } from 'cydon'

@define('my-pagination')
export class MyPagination extends CydonElement {
	static observedAttributes = ['page']

	perPages = [5, 10, 20, 50]
	perPage = 10
	page = 1
	total = 42

	attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
		if (name == 'page')
			this.page = +newVal
	}
}
```

## 指令
- 内置指令：`c-for`、`ref` 等
- 额外指令：`c-model`、`c-if`、`c-show`、`c-cloak`、`c-tp`
- 事件修饰符：`.once`、`.passive`、`.capture`、`.away`
- 自定义指令，包含全局与局部指令

## 文档
https://0-v-0.github.io/cydon/

## 示例
- [ToDo MVC](https://github.com/0-v-0/cydon/blob/main/packages/examples/todo-mvc.html)
- [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark/tree/master/frameworks/non-keyed/cydon)
