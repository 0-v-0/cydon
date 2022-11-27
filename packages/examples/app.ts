import { define, CydonOf, CydonElement } from 'cydon'

const STORAGE_KEY = 'todos-cydon',
	ITEM_KEYS = ['name', 'done']

const storage = {
	load: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	save(todos: TodoItem[]) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos, ITEM_KEYS))
	}
}

@define('todo-item', { extends: 'li' })
class TodoItem extends CydonOf(HTMLLIElement) {
	name = ''
	done = false
	editing = false

	$p!: TodoApp
	private beforeEditCache?: string

	connectedCallback() {
		this.onUpdate = prop => this.$p.updateValue(prop)
		super.connectedCallback()
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
			queueMicrotask(() => storage.save(this.$p.items))
		}
	}

	editTodo() {
		this.beforeEditCache = this.name
		this.editing = true
	}

	removeTodo() {
		const { items } = this.$p
		const index = items.findIndex(todo => todo == this)
		items.splice(index, 1)
	}
}

@define('todo-app')
class TodoApp extends CydonElement {
	// app initial state
	newTodo = ''
	visibility = 'all'
	filter: boolean | null = null

	items: TodoItem[] = []
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
	connectedCallback() {
		this.items = storage.load()
		// simple router
		addEventListener('hashchange', () => this.updateFilter())

		this.updateFilter()
		super.connectedCallback()
	}

	updateFilter() {
		let visibility = location.hash.substring(2)

		this.filter = visibility == 'active' ? false :
			visibility == 'completed' ? true : null
		this.data.visibility = this.filter == null ? 'all' : visibility

		// update subcomponents
		this.items.forEach(item => item.$p = this)
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
}

declare global {
	interface HTMLElementTagNameMap {
		'todo-app': TodoApp
		'todo-item': TodoItem
	}
}
