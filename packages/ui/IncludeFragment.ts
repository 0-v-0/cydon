// From https://github.com/github/include-fragment-element/blob/main/src/index.ts

const loaded = new WeakMap()

// Functional stand in for the W3 spec "queue a task" paradigm
const task = () => new Promise<void>(resolve => setTimeout(resolve, 0))

export default class IncludeFragmentElement extends HTMLElement {
	static observedAttributes = ['src', 'lazy']

	get src() {
		const src = this.getAttribute('src')
		return src ? new URL(src, this.ownerDocument!.baseURI).href : ''
	}

	set src(val) { this.setAttribute('src', val) }

	get lazy() { return this.hasAttribute('lazy') }

	set lazy(val) { this.toggleAttribute('lazy', val) }

	get accept() { return this.getAttribute('accept') || 'text/html' }

	set accept(val) { this.setAttribute('accept', val) }

	get data() { return this.load() }

	private busy?: boolean

	attributeChangedCallback() {
		if (this.isConnected && !this.lazy)
			this.replace()
	}

	constructor() {
		super()
		this.attachShadow({ mode: 'open' }).innerHTML = `
			<style> :host { display: block } </style>
			<slot></slot>`
	}

	connectedCallback() {
		this.observer = new IntersectionObserver(
			entries => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const { target } = entry
						this.observer!.unobserve(target)
						if (target instanceof IncludeFragmentElement && target.lazy)
							this.replace()
					}
				}
			},
			{
				// Currently the threshold is set to 256px from the bottom of the viewport
				// with a threshold of 0.1. This means the element will not load until about
				// 2 keyboard-down-arrow presses away from being visible in the viewport,
				// giving us some time to fetch it before the contents are made visible
				rootMargin: '0px 0px 256px 0px',
				threshold: 0.01
			}
		)
		if (this.lazy)
			this.observer.observe(this)
		else if (this.src)
			this.replace()
	}

	request() {
		const { src } = this
		if (!src)
			throw new Error('missing src')

		return new Request(src, {
			method: 'GET',
			credentials: 'same-origin',
			headers: {
				Accept: this.accept
			}
		})
	}

	load(): Promise<string> {
		const src = this.src
		let data = loaded.get(this)
		if (data && data.src == src)
			return data.data

		// We mimic the same event order as <img>, including the spec
		// which states events must be dispatched after "queue a task".
		// https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
		data = src ? task()
			.then(() => {
				this.dispatchEvent(new Event('loadstart'))
				return fetch(this.request())
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
		loaded.set(this, { src, data })
		return data
	}

	private observer?: IntersectionObserver

	private replace() {
		if (this.busy) return Promise.resolve()
		this.busy = true

		this.observer?.unobserve(this)
		return this.load().then(
			(html: string) => {
				const tpl = document.createElement('template')
				tpl.innerHTML = html
				const canceled = !this.dispatchEvent(
					new CustomEvent('include-fragment-replace', { cancelable: true, detail: tpl.content })
				)
				if (!canceled) {
					this.replaceWith(tpl.content)
					this.dispatchEvent(new CustomEvent('include-fragment-replaced'))
				}
			},
			() => this.classList.add('is-error')
		)
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'include-fragment': IncludeFragmentElement
	}
}

customElements.define('include-fragment', IncludeFragmentElement)