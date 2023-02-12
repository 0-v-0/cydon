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

import { CydonElement } from '../packages/cydon'

class MainApp extends CydonElement {
	items = []

	selected = null

	deleteOne() {
		const id = this.item.id
		const index = this.items.findIndex(item => item.id == id)
		this.items.splice(index, 1)
	}

	selectOne() {
		this.selected = this.item
	}

	create1k() {
		this.items = buildData(1000)
		this.selected = null
	}

	append1k() {
		this.items = this.items.concat(buildData(1000))
		this.selected = null
	}

	update10() {
		const arr = this.items
		for (let i = 0; i < arr.length; i += 10) {
			arr[i].label += ' !!!'
		}
		this.selected = null
	}

	clear() {
		this.items = []
		this.selected = null
	}

	create10k() {
		this.items = buildData(10000)
		this.selected = null
	}

	swap() {
		if (this.items.length > 998) {
			const { id, label } = this.items[1]
			this.items[1] = this.items[998]
			this.items[998] = { id, label }
		}
	}
}

customElements.define('main-app', MainApp)