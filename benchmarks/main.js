const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy']
const COLOURS = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange']
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard']

let nextId = 1
function buildData(count) {
	const data = []

	for (let i = 0; i < count; i++) {
		data.push({
			id: nextId++,
			label: `${ADJECTIVES[_random(ADJECTIVES.length)]} ${COLOURS[_random(COLOURS.length)]} ${NOUNS[_random(NOUNS.length)]}`,
		})
	}

	return data
}

function _random(max) {
	return Math.round(Math.random() * 1000) % max
}

import { CydonElement } from '../packages/cydon';

class MainApp extends CydonElement {
	items = []

	app = this

	get selected() {
		return this.app._selected
	}
	set selected(value) {
		this.app._selected = value
	}

	clickHandler(e) {
		const getId = (el) => {
			while (el) {
				if (el.cydon)
					return el.cydon.item.id
				el = el.parentNode
			}
		}
		const role = e.target.getAttribute('role')
		if (role == 'delete')
			this.deleteOne(getId(e.target))
		else if (role == 'select')
			this.selectOne(getId(e.target))
	}

	deleteOne(id) {
		console.time('delete1')
		const index = this.items.findIndex(item => item.id == id)
		this.items.splice(index, 1)
		console.timeEnd('delete1')
	}

	selectOne(id) {
		console.time('select1')
		this.selected = id
		console.timeEnd('select1')
	}

	create1k() {
		console.time('create1k')
		this.items = buildData(1000)
		this.selected = null
		console.timeEnd('create1k')
	}

	append1k() {
		console.time('append1k')
		this.items = this.items.concat(buildData(1000))
		this.selected = null
		console.timeEnd('append1k')
	}

	update10() {
		console.time('update10')
		for (let i = 0; i < this.items.length; i += 10) {
			this.items[i].label += ' !!!'
		}
		this.selected = null
		console.timeEnd('update10')
	}

	clear() {
		this.items = []
		this.selected = null
	}

	testClear() {
		console.time('clear')
		this.clear()
		console.timeEnd('clear')
	}

	create10k() {
		performance.mark('create10kstart')
		this.items = buildData(10000)
		this.selected = null
		performance.mark('create10kend')
		console.log(
			performance.measure('create10k', 'create10kstart', 'create10kend')
		)
	}

	swap() {
		console.time('swap')
		if (this.items.length > 998) {
			const { id, label } = this.items[1]
			this.items[1] = this.items[998]
			this.items[998] = { id, label }
		}
		console.timeEnd('swap')
	}
}

customElements.define('main-app', MainApp)