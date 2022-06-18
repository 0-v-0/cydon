# @cydon/ustyle

Stylus preprocessor for Unocss

本插件主要功能有以下两个
1. Stylus预处理器：将所有`Shadow DOM`内的style标签的内容视为stylus处理，再将生成的css交给unocss处理
2. emmet语法扩展

## Usage
see [Stylus](https://github.com/stylus/stylus), [Unocss](https://github.com/unocss/unocss)
```ts
// vite.config.ts
export default {
	plugins: [
		ustyle({
			stylus: {/* stylus options */}
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