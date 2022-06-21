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
| 名称         | 类型                    | 说明                                        |
| ------------ | ----------------------- | ------------------------------------------- |
| root         | string                  | emt文件所在根文件夹                         |
| alwaysReload | boolean                 | 开发模式下，当emt文件改变后是否总是重新加载 |
| log          | boolean                 | 重新加载时是否输出信息到控制台，默认true    |
| styleProc    | StyleProcFunc           |                                             |
| read         | (path: string)=> string | 自定义文件读取函数                          |
| render       | Render                  | 自定义模板渲染函数                          |
| template     | string                  | 自定义模板文件                              |
