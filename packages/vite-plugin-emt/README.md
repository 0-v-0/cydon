# vite-plugin-emt

emt文件支持

处理过程：
```
Emmet with indentations ─► Standard Emmet
                                 │
                                 ▼
                HTML ◄──── HTML Template
```

## Requirements
Node 16+

## Build
```sh
pnpm build
```

## Usage
```ts
// vite.config.ts
import Unocss from 'unocss/vite'
import emt, { inlineStylus } from 'vite-plugin-emt'

export default {
	plugins: [
		emt(/* emt options */),
		Unocss({
			transformers: [
				inlineStylus(/* stylus options */),
				// other transformers...
			]
			// Unocss options...
		})
	]
}
```

## Options
所有参数均可选
| 名称         | 类型                                          | 说明                                                                        |
| ------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| alwaysReload | boolean                                       | 开发模式下，当emt文件改变后是否总是重新加载                                 |
| classy       | boolean                                       | 启用emmet扩展语法（默认值：`true`）                                         |
| cssProps     | Set\<string>                                  | 将集合内的元素视为CSS属性，渲染为内联样式，传入一个空的集合表示禁用内联样式 |
| literal      | string                                        | emt字面量前缀，默认为emt，为空串表示禁用emt字面量                           |
| log          | (server: ViteDevServer, file: string) => void | 日志函数，默认重新加载时输出信息到控制台                                    |
| paths        | string[]                                      | 除`root`外的include搜索路径                                                 |
| read         | (path: string) => string                      | 自定义文件读取函数                                                          |
| render       | Render                                        | 自定义模板渲染函数                                                          |
| root         | string                                        | emt文件所在根文件夹                                                         |
| templated    | boolean                                       | 为true时每个emt元素模板至多展开一次                                         |
| tplFile      | string                                        | 自定义模板文件                                                              |
| writeHtml    | boolean                                       | 是否输出html，用于构建                                                      |

### emt环境变量
环境变量类型均为string
| 名称         | 说明                  |
| ------------ | --------------------- |
| REQUEST_PATH | 请求的emt文件完整路径 |

### 标题
位于emt文件开头，格式如下：
```styl
title{标题}*
```
大括号中的内容会自动赋值给`doc_title`变量，最后渲染到page.emt中的对应位置

末尾的`*`表示注释，用来防止在渲染HTML时输出title标签，**不能省略**

无标题（或标题为空）的emt文件会被当作模板处理（无法通过浏览器直接访问）

### 引入CSS
在需要引入的位置加上
```styl
scr[t=module]{import 'example.styl'}
```
vite会自动将生成的css插入到head中

## emmet语法扩展
input:
```styl
.flex.items-center
	p 6
	max-w sm
	mx auto
	bg white
	rounded xl
	shadow lg
	space x 4
```
output:
```html
<div class="flex items-center p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg space-x-4"></div>
```

`cssProps`中的属性当成内联样式处理

input:
```styl
#s
	p 0
	width 50%
```
output:
```html
<div id="s" class="p-0" style="width:50%"></div>
```

## 预处理器
### Stylus预处理器
inlineStylus

将所有`Shadow DOM`内的style标签的内容视为stylus处理，再将生成的css交给unocss处理

### TypeScript预处理器
inlineTS

将所有内联`<script>`当成TypeScript处理

### 预处理器类型声明
在env.d.ts中加上
```ts
import { Preprocessor } from 'vite-plugin-emt'

declare global {
	declare const emt: Preprocessor, styl: Preprocessor
}
```
若指定了Options.literal，上面代码中的emt和styl需要改为Options.literal指定的名称