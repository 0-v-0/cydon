import { customBind, customElement, mixinData, ReactiveElement } from 'cydon'
import { ListElement } from '../ui'

type Todo = {
	name: string
	done?: boolean
}

const STORAGE_KEY = 'todos-cydon'

const storage = {
	fetch: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	save(todos: Todo[]) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
	}
}

@customElement('todo-item', { extends: 'li' })
export class TodoItem extends mixinData(HTMLLIElement, {
	name: '',
	ok: false
}) {
	list!: TodoApp
	editing = false
	get done() {
		return this.ok
	}
	set done(value) {
		this.list.data.items = this.list.$items
		this.ok = value
	}

	data = customBind(this).data
	beforeEditCache?: string

	connectedCallback() {
		if (this.list)
			this.data.bind()
	}

	keyup(e: KeyboardEvent) {
		if (e.key == 'Enter')
			this.doneEdit()

		if (e.key == 'Escape') {
			this.editing = false
			this.name = this.beforeEditCache!
		}
	}

	doneEdit() {
		if (this.editing) {
			this.editing = false
			this.name = this.name?.trim()
			if (!this.name)
				this.removeTodo()
		}
	}

	editTodo() {
		this.beforeEditCache = this.name
		this.editing = true
	}

	removeTodo() {
		const { items } = this.list
		// BUG
		const index = items.findIndex(todo => todo == this.data)
		items.splice(index, 1)
	}
}

@customElement('todo-app')
export class TodoApp extends ListElement<Todo> {
	newTodo = ''
	visibility = 'all'
	filter: boolean | null = null

	get allDone() {
		return !this.remaining()
	}
	set allDone(value) {
		this.items.forEach(todo => todo.done = value)
	}

	remaining() {
		let count = 0
		for (const todo of this.items) {
			if (!todo.done)
				count++
		}
		return count
	}

	constructor() {
		super('.todo')
		this.root = this.querySelector('.todo-list')!
		addEventListener('hashchange', () => this.updateFilter())
	}

	connectedCallback() {
		this.items = storage.fetch()
		this.data.bind()
		this.updateFilter()
	}

	updateFilter() {
		let visibility = location.hash.substring(2)
		if (visibility == 'active')
			this.filter = false
		else if (visibility == 'completed')
			this.filter = true
		else
			this.filter = null
		this.data.visibility = visibility
		this.data.items.forEach((item: TodoItem) => item.list = this)
	}

	addTodo(e: KeyboardEvent) {
		if (e.key == 'Enter' && this.newTodo) {
			this.data.items.push({ name: this.newTodo, done: false })
			this.newTodo = ''
		}
	}

	removeCompleted() {
		this.items = this.items.filter(item => !item.done)
	}

	pluralize(word: string, count: number) {
		return word + (count == 1 ? '' : 's')
	}

	override render(el: ReactiveElement, item?: Todo) {
		el.hidden = item == void 0
		if (item) {
			Object.assign(el.data, item)
			this.data.items = this.items
		}
		Promise.resolve().then(() =>
			storage.save(this.items.map((item: any) => item.$data)))
	}

	override createItem() {
		const item = <TodoItem>super.createItem()
		item.list = <this>this.data
		return item
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'todo-app': TodoApp
		'todo-item': TodoItem
	}
}
