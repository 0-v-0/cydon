// From https://github.com/github/include-fragment-element/blob/main/src/index.ts

import { delay } from '../util'
import { AsyncLoad } from './AsyncLoad'

export class ImportHTML extends AsyncLoad {
	get src() {
		const src = this.getAttribute('src')
		return src ? new URL(src, this.baseURI).href : ''
	}

	set src(val) { this.setAttribute('src', val) }

	get headers(): HeadersInit {
		const headers = this.getAttribute('headers')
		return headers ? JSON.parse(headers) : {
			Accept: 'text/html'
		}
	}

	set headers(val) { this.setAttribute('accept', JSON.stringify(val)) }

	constructor() {
		super()
		this.loader = async () => {
			if (!this.src)
				throw new Error('missing src')

			// We mimic the same event order as <img>, including the spec
			// which states events must be dispatched after "queue a task".
			// https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
			await delay()
			this.dispatchEvent(new Event('loadstart'))
			let tpl
			try {
				const data = await this.request()
				// Dispatch `load` and `loadend` async to allow
				// the `load()` promise to resolve _before_ these
				// events are fired.
				delay().then(() => {
					this.dispatchEvent(new Event('load'))
					this.dispatchEvent(new Event('loadend'))
				})
				tpl = document.createElement('template')
				tpl.innerHTML = data
			} catch (err) {
				// Dispatch `error` and `loadend` async to allow
				// the `load()` promise to resolve _before_ these
				// events are fired.
				delay().then(() => {
					this.dispatchEvent(new ErrorEvent('error', { error: err }))
					this.dispatchEvent(new Event('loadend'))
				})
				throw err
			}
			const canceled = !this.dispatchEvent(
				new CustomEvent('frag-replace', { cancelable: true, detail: tpl.content })
			)
			if (!canceled) {
				this.replaceWith(tpl.content)
				this.dispatchEvent(new CustomEvent('frag-replaced'))
			}
		}
	}

	async request() {
		const resp = await fetch(this.src, {
			method: 'GET',
			credentials: 'same-origin',
			headers: this.headers
		})
		if (resp.ok)
			return resp.text()
		throw new Error(`Failed to load resource: the server responded with a status of ${resp.status}`)
	}
}
customElements.define('import-html', ImportHTML)

declare global {
	interface HTMLElementTagNameMap {
		'import-html': ImportHTML
	}
	interface HTMLElementEventMap {
		'frag-replace': CustomEvent<DocumentFragment>
		'frag-replaced': CustomEvent
	}
}
