# Cydon

[![npm-v](https://img.shields.io/npm/v/cydon.svg)](https://npmjs.com/package/cydon)
[![npm-d](https://img.shields.io/npm/dt/cydon.svg)](https://npmjs.com/package/cydon)
[![brotli](http://img.badgesize.io/https://unpkg.com/cydon/dist/cydon.iife.js?compression=brotli&label=brotli)](https://bundlephobia.com/result?p=cydon)

A lightweight library for building fast, reactive web components.

## Features
- No dependencies
- No virtual DOM, components are just DOM elements
- Performant and ultra-lightweight: ~3kB minified & brotli'd
- Intuitive and WYSIWYG: use HTML-based template syntax
- Simple: only provide minimalistic API required to implement reactivity of web components

## Preview
HTML:
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
        <!-- Watch callback -->
        <div class="wrapper" :="console.log('page No. is', page)">
            <!-- Event binding -->
            <button @click="page--">Prev</button>
            <!-- Two-way binding -->
            <select c-model="perPage" title="items per page">
                <template c-for="n; perPages">
                    <!-- DOM prop binding, attr binding and text interpolation -->
                    <option .selected="perPage == n" value="$n">$n</option>
                </template>
            </select>
            <span>
                per page
                <!-- text interpolation using expressions -->
                ${(page-1)*perPage+!!total}-${Math.min(page*perPage,total)} / $total
            </span>
            <button @click="page++">Next</button>
        </div>
    </template>
</my-pagination>
```
TypeScript:
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

## Directives
- Builtin directives: `c-for`, `ref`, etc.
- Extra directives: `c-model`, `c-if`, `c-show`, `c-cloak`, `c-tp`
- Event Modifiers: `.once`, `.passive`, `.capture`, `.away`
- Custom directives, including global and local directives

## Documentation
https://0-v-0.github.io/cydon/


## Examples
- [ToDo MVC](https://github.com/0-v-0/cydon/blob/main/packages/examples/todo-mvc.html)
- [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark/tree/master/frameworks/non-keyed/cydon)
