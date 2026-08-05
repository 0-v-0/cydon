# unplugin-emt-styl

emt与内联styl支持

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
import { vite as emt } from 'unplugin-emt-styl'
import { vite as styl } from 'unplugin-emt-styl/styl'

export default {
	plugins: [
		emt(/* emt options */),
		styl(/* stylus options */),
	]
}
```

## Options
所有参数均可选
| 名称         | 类型                                          | 说明                                                                        |
| ------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| alwaysReload | boolean                                       | 开发模式下，是否对任何emt文件变动都重新加载页面（默认值：`false`）。为`false`时只重载当前打开的、且内容依赖被修改的emt文件的页面 |
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
| writeHtml    | boolean                                       | 是否输出html，用于调试                |

### writeHtml在不同构建工具中的兼容性

`writeHtml` 默认值为`true`，仅在开发模式下当emt文件改变时将渲染后的html写入磁盘，方便调试查看。无论是否启用`writeHtml`，emt文件的预览和构建都不依赖于它。

不启用`writeHtml`时，插件通过虚拟html模块（`resolveId`/`load`）和开发中间件（`configureServer`）动态渲染emt文件。各构建工具的兼容性如下：

| 构建工具 | 构建（`resolveId`/`load`） | 预览/开发（`configureServer`） | 说明                                                                            |
| -------- | ------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| vite     | ✓                         | ✓                              | 完全兼容。构建通过虚拟html模块，开发通过中间件拦截html请求                      |
| rolldown | ✓                         | -                              | 构建兼容。rolldown原生支持rollup风格的`resolveId`/`load`                        |
| rollup   | ✓                         | -                              | 构建兼容。需配合`@rollup/html`等插件处理html入口                                |
| esbuild  | 部分                      | -                              | esbuild不原生支持html入口，虚拟模块可加载但html输出需额外处理                   |
| webpack  | 部分                      | -                              | 需配合`html-webpack-plugin`等插件，虚拟模块通过`webpack-virtual-modules`实现    |
| rspack   | 部分                      | -                              | 需配合`html-rspack-plugin`等插件，虚拟模块通过rspack的`VirtualModulesPlugin`实现 |
| farm     | 部分                      | -                              | 取决于farm对html入口的支持情况                                                  |

说明：
- vite为推荐使用场景，预览与构建均完全兼容
- 其他构建工具建议保留`writeHtml: true`，由开发阶段先生成html文件再交给对应工具处理
- 若禁用`writeHtml`且使用非vite工具，请确保对应工具能正确处理插件返回的虚拟html模块

### HMR

vite开发模式下，插件会跟踪每个渲染页面对emt文件的依赖（包括通过`include`引入的文件和自定义元素模板），并在依赖的emt文件变动时自动向浏览器发送`full-reload`，无需手动刷新。删除emt文件时也会清理对应的依赖记录。

`alwaysReload`控制重载范围：
- 默认（`false`）：仅当正在浏览的页面依赖的emt文件变动时才重载（精确重载）
- `true`：任何emt文件变动都重载

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
	shadow lg
	space x 4
```
output:
```html
<div class="flex items-center p-6 max-w-sm mx-auto shadow-lg space-x-4"></div>
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

### TODO

若标签名末尾带有冒号，则将该部分当CSS而非HTML处理

若属性名末尾带有冒号，则生成
CSS选择器生成规则：从距离最近的带有id的父元素或根元素开始直到本元素，以>连接

input:
```styl
#t
	dl
		dt:after
			content: ":"
		dd
			margin: 0
```
output:
HTML
```html
<div id="t"><dl><dt></dt><dd></dd></dl></div>
```
CSS
```css
#t>dl>dt:after{content:":"}
#t>dl>dd{margin:0}
```

## 预处理器
### Stylus预处理器
inlineStylus：将所有`Shadow DOM`内的style标签的内容视为stylus处理，再将生成的css交给unocss处理

使用：
```ts
import { inlineStylus } from 'vite-plugin-emt'

export default defineConfig({
	// …
	plugins: [
		inlineStylus(),
		// …
	],
})
```

### 预处理器类型声明
在env.d.ts中加上
```ts
import { Preprocessor } from 'unplugin-emt-styl'

declare global {
	declare const emt: Preprocessor, styl: Preprocessor
}
```
若指定了Options.literal，上面代码中的emt和styl需要改为Options.literal指定的名称