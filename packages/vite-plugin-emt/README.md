# vite-plugin-emt

emt文件支持

处理过程：
```
Emmet with indentations ─► Standard Emmet
                                 │
                                 ▼
                HTML ◄──── HTML Template
```

## Build
```sh
pnpm build
```

## Usage
```ts
// vite.config.ts
import emt from 'vite-plugin-emt'

export default {
	plugins: [
		emt(/* emt options */),
	]
}
```

## Options
所有参数均可选
| 名称         | 类型                     | 说明                                        |
| ------------ | ------------------------ | ------------------------------------------- |
| root         | string                   | emt文件所在根文件夹                         |
| alwaysReload | boolean                  | 开发模式下，当emt文件改变后是否总是重新加载 |
| log          | boolean                  | 重新加载时是否输出信息到控制台，默认true    |
| styleProc    | StyleProcFunc            |                                             |
| read         | (path: string) => string | 自定义文件读取函数                          |
| render       | Render                   | 自定义模板渲染函数                          |
| paths        | string[]                 | 除`root`外的include搜索路径                 |
| templated    | boolean                  | 为true时每个emt元素模板至多展开一次         |
| tplFile      | string                   | 自定义模板文件                              |

## emt模板
a.emt:
```styl
div
	custom-component
		br
```
custom-component.emt:
```styl
section
	.foo
```
等价于：
```styl
div
	custom-component
		section
			.foo
		br
```

缩进与非缩进格式可以混用，例如：

```styl
div
	.a>.b
	.c+.d
	(.e>.f)*2
```
等价于：
```styl
div
	.a
		.b
	.c
	.d
	.e
		.f
	.e
		.f
```

### emt环境变量
环境变量类型均为string
| 名称         | 说明                  |
| ------------ | --------------------- |
| REQUEST_PATH | 请求的emt文件完整路径 |

### page.emt文件
作为所有网页的模板。e.g.:
```styl
!
html
	head
		meta[charset=utf-8]
		meta[name=viewport content="width=device-width,initial-scale=1.0"]
		title{$doc_title}
	.
		{${include(REQUEST_PATH)}}
```

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
