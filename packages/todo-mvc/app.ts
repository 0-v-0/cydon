import { customElement, CydonOf, ListElement } from 'cydon'

type Todo = {
	name: string
	done?: boolean
}

const STORAGE_KEY = 'todos-cydon'

const storage = {
	load: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	save(todos: Todo[]) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos, TodoApp.itemKeys))
	}
}

@customElement('todo-item', { extends: 'li' })
class TodoItem extends CydonOf(HTMLLIElement) {
	name = ''
	done = false
	editing = false

	list!: TodoApp
	private beforeEditCache?: string

	connectedCallback() {
		if (this.list) {
			this.onUpdate = prop => this.list.updateValue(prop)
			this.bind()
		}
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

			// save data
			queueMicrotask(() => storage.save(this.list.items))
		}
	}

	editTodo() {
		this.beforeEditCache = this.name
		this.editing = true
	}

	removeTodo() {
		const { items } = this.list
		const index = items.findIndex(todo => todo == this)
		items.splice(index, 1)
	}
}

@customElement('todo-app')
export class TodoApp extends ListElement<TodoItem> {
	static itemKeys = ['name', 'done']

	// app initial state
	newTodo = ''
	visibility = 'all'
	filter: boolean | null = null

	// HACK
	done: undefined

	// computed
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
		// HACK: update subcomponents
		this.done

		// save data
		queueMicrotask(() => storage.save(this.items))
		return count
	}

	// init
	constructor() {
		super('.todo')
		this.root = this.querySelector('.todo-list')!

		// simple router
		addEventListener('hashchange', () => this.updateFilter())
	}

	connectedCallback() {
		this.items = storage.load()
		this.bind()
		this.updateFilter()
	}

	updateFilter() {
		let visibility = location.hash.substring(2)

		this.filter = visibility == 'active' ? false :
			visibility == 'completed' ? true : null
		this.data.visibility = visibility

		// update subcomponents
		this.items.forEach(item => item.list = this)
	}

	// methods that implement data logic.
	// note there's no DOM manipulation here at all.

	addTodo(e: KeyboardEvent) {
		if (e.key == 'Enter' && this.newTodo) {
			this.items.push(<TodoItem>{ name: this.newTodo, done: false })
			this.newTodo = ''
		}
	}

	removeCompleted() {
		this.items = this.items.filter(item => !item.done)
	}

	pluralize(word: string, count: number) {
		return word + (count == 1 ? '' : 's')
	}

	override render(el?: TodoItem, item?: TodoItem) {
		el = super.render(el, item)
		if (!el.list)
			el.list = this
		return el
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'todo-app': TodoApp
		'todo-item': TodoItem
	}
}
