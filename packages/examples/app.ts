import { define, CydonElement, Data } from 'cydon'

type Todo = {
	name: string
	done: boolean
}

const STORAGE_KEY = 'todos-cydon',
	ITEM_KEYS = ['name', 'done']

const storage = {
	load: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	save(todos: any[]) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos, ITEM_KEYS))
	}
}

@define('todo-app')
class TodoApp extends CydonElement {
	// app initial state
	newTodo = ''
	visibility = 'all'
	filter: boolean | null = null

	items: Todo[] = []

	todo!: Todo

	editing: Data | null = null
	private beforeEditCache?: string

	// computed
	get allDone() {
		return !this.remaining
	}
	set allDone(value) {
		this.items.forEach(todo => todo.done = value)
	}

	get remaining() {
		let count = 0
		for (const todo of this.items) {
			if (!todo.done)
				count++
		}

		// save data
		queueMicrotask(() => storage.save(this.items))
		return count
	}

	// init
	connectedCallback() {
		this.items = storage.load()
		// simple router
		addEventListener('hashchange', () => this.updateFilter())

		this.updateFilter()
		super.connectedCallback()
	}

	updateFilter() {
		let visibility = location.hash.substring(2)

		this.data.filter = visibility == 'active' ? false :
			visibility == 'completed' ? true : null
		this.data.visibility = this.filter == null ? 'all' : visibility
	}

	// methods that implement data logic.
	// note there's no DOM manipulation here at all.

	addTodo(e: KeyboardEvent) {
		if (e.key == 'Enter' && this.newTodo) {
			this.items.push({ name: this.newTodo, done: false })
			this.newTodo = ''
		}
	}

	keyup(e: KeyboardEvent) {
		if (e.key == 'Enter')
			this.doneEdit()

		if (e.key == 'Escape') {
			this.editing = null
			this.todo.name = this.beforeEditCache!
		}
	}

	doneEdit() {
		if (this.editing) {
			this.editing = null
			this.todo.name = this.todo.name?.trim()
			if (!this.todo.name)
				this.removeTodo()

			// save data
			queueMicrotask(() => storage.save(this.items))
		}
	}

	editTodo() {
		this.beforeEditCache = this.todo.name
		this.editing = this.todo
	}

	removeTodo() {
		const { items } = this
		const index = items.findIndex(todo => todo == this.todo)
		items.splice(index, 1)
	}

	removeCompleted() {
		this.items = this.items.filter(item => !item.done)
	}

	pluralize(word: string, count: number) {
		return word + (count == 1 ? '' : 's')
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'todo-app': TodoApp
	}
}
