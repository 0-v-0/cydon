// From https://github.com/github/include-fragment-element/blob/main/src/index.ts

import { AsyncLoad } from './AsyncLoad'

// Functional stand in for the W3 spec "queue a task" paradigm
const task = () => new Promise<void>(resolve => setTimeout(resolve))

export class ImportHTML extends AsyncLoad {
	get src() {
		const src = this.getAttribute('src')
		return src ? new URL(src, this.baseURI).href : ''
	}

	set src(val) { this.setAttribute('src', val) }

	get accept() { return this.getAttribute('accept') || 'text/html' }

	set accept(val) { this.setAttribute('accept', val) }

	loading?: boolean

	constructor() {
		super()
		this.loader = async () => {
			if (this.loading) return Promise.resolve()
			this.loading = true

			// We mimic the same event order as <img>, including the spec
			// which states events must be dispatched after "queue a task".
			// https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
			const data = this.src ? task()
				.then(() => {
					this.dispatchEvent(new Event('loadstart'))
					return this.request()
				})
				.then(response => {
					if (!response.ok)
						throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
					return response.text()
				})
				.then(
					data => {
						// Dispatch `load` and `loadend` async to allow
						// the `load()` promise to resolve _before_ these
						// events are fired.
						task().then(() => {
							this.dispatchEvent(new Event('load'))
							this.dispatchEvent(new Event('loadend'))
						})
						return data
					},
					error => {
						// Dispatch `error` and `loadend` async to allow
						// the `load()` promise to resolve _before_ these
						// events are fired.
						task().then(() => {
							this.dispatchEvent(new Event('error'))
							this.dispatchEvent(new Event('loadend'))
						})
						throw error
					}
				) : Promise.reject(new Error('missing src'))
			const tpl = document.createElement('template')
			tpl.innerHTML = await data
			const canceled = !this.dispatchEvent(
				new CustomEvent('frag-replace', { cancelable: true, detail: tpl.content })
			)
			if (!canceled) {
				this.replaceWith(tpl.content)
				this.dispatchEvent(new CustomEvent('frag-replaced'))
			}
		}
	}

	request() {
		return fetch(this.src, {
			method: 'GET',
			credentials: 'same-origin',
			headers: {
				Accept: this.accept
			}
		})
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'import-html': ImportHTML
	}
	interface HTMLElementEventMap {
		'frag-replace': CustomEvent<DocumentFragment>
		'frag-replaced': CustomEvent
	}
}

customElements.define('import-html', ImportHTML)