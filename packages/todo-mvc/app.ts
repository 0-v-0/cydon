import { lazyBind, customElement } from 'cydon'
import { ListElement } from '../ui'

type Todo = {
	name: string
	done?: boolean
}

const STORAGE_KEY = 'todos-cydon'

const storage = {
	load: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	save(todos: Todo[]) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos, ['name', 'done']))
	}
}

@customElement('todo-item', { extends: 'li' })
class TodoItem extends HTMLLIElement {
	name = ''
	done = false
	editing = false

	list!: TodoApp
	#cydon = lazyBind(this)
	private beforeEditCache?: string

	get data() {
		return this.#cydon.data
	}

	connectedCallback() {
		if (this.list) {
			this.#cydon.onUpdate = prop => this.list.cydon.updateValue(prop)
			this.data.bind()
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
export class TodoApp extends ListElement<Todo> {
	// app initial state
	newTodo = ''
	visibility = 'all'
	filter: boolean | null = null

	// HACK
	name: undefined
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
		this.name
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
		this.data.bind()
		this.updateFilter()
	}

	updateFilter() {
		let visibility = location.hash.substring(2)

		this.filter = visibility == 'active' ? false :
			visibility == 'completed' ? true : null
		this.data.visibility = visibility

		// update subcomponents
		this.items.forEach(item => (<TodoItem>item).data.list = this)
	}

	// methods that implement data logic.
	// note there's no DOM manipulation here at all.

	addTodo(e: KeyboardEvent) {
		if (e.key == 'Enter' && this.newTodo) {
			this.items.push({ name: this.newTodo, done: false })
			this.newTodo = ''
		}
	}

	removeCompleted() {
		this.items = this.items.filter(item => !item.done)
	}

	pluralize(word: string, count: number) {
		return word + (count == 1 ? '' : 's')
	}

	override render(el?: TodoItem, item?: Todo) {
		el = <TodoItem>super.render(el, item)
		if (!el.list)
			el.list = <this>this.data
		return el
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'todo-app': TodoApp
		'todo-item': TodoItem
	}
}
