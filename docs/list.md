# 列表
Cydon并没有与Vue中的`v-for`类似的指令，取而代之的是封装好的列表组件

以实现一个简单的翻页表格组件为例

index.emt
```stylus
s-table[per-page=5]
```

s-table.emt
```stylus
template[shadowroot=open]
	style[lang=styl]{
		.wrapper
			margin 1em
		table
			box-shadow 0 2px 1px -1px rgba(0,0,0,.2),0 1px 1px 0 rgba(0,0,0,.14),0 1px 3px 0 rgba(0,0,0,.12)
			border-radius 0.3em
			line-height 2em
		th, td
			padding 0 1em
		td
			border-bottom thin solid rgba(0,0,0,.12)
	}
	.wrapper
		table
			thead
				tr
					th{Name}
					th{Age}
			tbody
				tr[is=s-row hidden]
					td{$name}
					td{$age}
		select[c-model=perPage]
			option[value=5]{5}
			option[value=10]{10}
			option[value=20]{20}
		sp{per page ${pageNum*perPage+1}-${pageNum*perPage+items.length} of ${list.length}}
		button[@click=pageNum--]{prev}
		button[@click=pageNum++]{next}
```

s-table.ts
```ts
import { CydonOf, Data, ListElement, query } from 'cydon'

class TableElement<T extends {}> extends ListElement<T> {
	static observedAttributes = ['per-page']
	private _list: T[] = []
	private _perPage = 10
	private _pageNum = 0

	// 每页项数
	get perPage() {
		return this._perPage
	}
	set perPage(value) {
		this._perPage = value || 10
		this.list = this._list
	}

	// 页码
	get pageNum() {
		return this._pageNum
	}
	set pageNum(value) {
		this._pageNum = value
		this.list = this._list
	}

	// 表格数据
	get list() {
		return this._list
	}
	set list(data) {
		this._list = data
		const i = this.pageNum, n = this.perPage
		super.items = data.slice(i * n, i * n + n)
	}

	constructor(selector = 'tbody>tr', data?: Data) {
		super(selector, data)
		const tbody = query(this, 'tbody')
		if (!tbody)
			throw new Error('Missing table element')
		this.root = tbody
	}

	attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
		if (name == 'per-page')
			this.data.perPage = +newVal || 10
	}
}

// 子组件必须先于父组件定义
@define('s-row', { extends: 'tr' })
class SRow extends CydonOf(HTMLTableRowElement) {
}

@define('s-table')
class STable extends TableElement<{}> {
	static itemKeys = ['name', 'age'] // 在这写出表格数据的所有键

	connectedCallback() {
		this.list = [
			{
				name: 'Alice',
				age: 23
			}
			{
				name: 'Bob',
				age: 25
			}
            /* … */
		]
		super.connectedCallback() // 别忘了这个！
	}
}
```