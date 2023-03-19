# vite-plugin-ustyle

Stylus preprocessor for Unocss

本插件主要功能有以下两个
1. Stylus预处理器：将所有`Shadow DOM`内的style标签的内容视为stylus处理，再将生成的css交给unocss处理
2. emmet语法扩展

## Build
```sh
pnpm build
```

## Usage
```ts
// vite.config.ts
import Unocss from 'unocss/vite'
import emt, { inlineStylus } from 'vite-plugin-ustyle'

export default {
	plugins: [
		emt(/* emt options */),
		Unocss({
			mode: 'shadow-dom',
			transformers: [
				inlineStylus(/* stylus options */),
				// other transformers...
			]
			// Unocss options...
		})
	]
}
```

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
<div class="space-x-4 shadow-lg rounded-xl bg-white mx-auto max-w-sm p-6 flex items-center"></div>
```

## Options
所有参数均可选，默认值均为false
| 名称           | 类型    | 说明                         |
| -------------- | ------- | ---------------------------- |
| inlineStyle    | boolean | 是否启用内联样式支持         |
| writeIndexHtml | boolean | 是否输出index.html，用于构建 |
其他选项见vite-plugin-emt
