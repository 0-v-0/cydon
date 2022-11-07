import { bind, customElement, Cydon } from 'cydon'
import { ListElement, TableElement } from '..'

@customElement('my-counter')
export class MyCounter extends HTMLElement {
	value = +this.getAttribute('value')!

	constructor() {
		super()
		bind(this)
	}

	inc() { this.value++ }
	dec() { this.value-- }
}

declare global {
	interface HTMLElementTagNameMap {
		'my-counter': MyCounter
		's-list': SList
		's-item': SItem
		's-table': STable
		's-row': SRow
	}
}

@customElement('s-list')
export class SList extends ListElement<string> {
	constructor() {
		super()
		new Cydon({ data: this, methods: <any>this }).bind(this.shadowRoot!)
	}

	add() {
		this.items.push('foo', 'bar')
	}
	pop() {
		this.items.pop()
	}

	override render(el: SItem, item?: string) {
		if (item)
			el.data.name = item
		super.render(el, item)
	}
}

@customElement('s-item')
export class SItem extends HTMLElement {
	data = bind(this).data
}

@customElement('s-row', { extends: 'tr' })
export class SRow extends HTMLTableRowElement {
	data = bind(this).data
}

@customElement('s-table')
export class STable extends TableElement<{}> {
	constructor() {
		super('tbody>tr')
	}

	connectedCallback() {
		this.data.list = [
			{
				name: 'Frozen Yogurt',
				calories: 159,
				fat: 6.0,
				carbs: 24,
				protein: 4.0,
				iron: '1%',
			},
			{
				name: 'Ice cream sandwich',
				calories: 237,
				fat: 9.0,
				carbs: 37,
				protein: 4.3,
				iron: '1%',
			},
			{
				name: 'Eclair',
				calories: 262,
				fat: 16.0,
				carbs: 23,
				protein: 6.0,
				iron: '7%',
			},
			{
				name: 'Cupcake',
				calories: 305,
				fat: 3.7,
				carbs: 67,
				protein: 4.3,
				iron: '8%',
			},
			{
				name: 'Gingerbread',
				calories: 356,
				fat: 16.0,
				carbs: 49,
				protein: 3.9,
				iron: '16%',
			},
			{
				name: 'Jelly bean',
				calories: 375,
				fat: 0.0,
				carbs: 94,
				protein: 0.0,
				iron: '0%',
			},
			{
				name: 'Lollipop',
				calories: 392,
				fat: 0.2,
				carbs: 98,
				protein: 0,
				iron: '2%',
			},
			{
				name: 'Honeycomb',
				calories: 408,
				fat: 3.2,
				carbs: 87,
				protein: 6.5,
				iron: '45%',
			},
			{
				name: 'Donut',
				calories: 452,
				fat: 25.0,
				carbs: 51,
				protein: 4.9,
				iron: '22%',
			},
			{
				name: 'KitKat',
				calories: 518,
				fat: 26.0,
				carbs: 65,
				protein: 7,
				iron: '6%',
			},
			{
				name: '???',
				calories: 452,
				fat: 25,
				carbs: 51,
				protein: 4.9,
				iron: '2%',
			},
			{
				name: '???',
				calories: 518,
				fat: 26.0,
				carbs: 65,
				protein: 7,
				iron: '6%',
			},
		]
	}
}
