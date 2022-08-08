// From https://github.com/github/include-fragment-element/blob/main/src/index.ts

const loaded = new WeakMap()

// Functional stand in for the W3 spec "queue a task" paradigm
const task = () => new Promise<void>(resolve => setTimeout(resolve, 0))

const isWildcard = (accept: string | null) => accept && accept.split(',').find(x => x.match(/^\s*\*\/\*/))

export default class IncludeFragmentElement extends HTMLElement {
	static get observedAttributes() {
		return ['src', 'loading']
	}

	get src() {
		const src = this.getAttribute('src')
		return src ? new URL(src, this.ownerDocument!.baseURI).href : ''
	}

	set src(val) {
		this.setAttribute('src', val)
	}

	get loading() {
		return this.getAttribute('loading') == 'lazy' ? 'lazy' : 'eager'
	}

	set loading(value) {
		this.setAttribute('loading', value)
	}

	get accept() {
		return this.getAttribute('accept') || 'text/html'
	}

	set accept(val) {
		this.setAttribute('accept', val)
	}

	get data() {
		return this.load()
	}

	private busy?: boolean

	attributeChangedCallback(attribute: string, oldVal: string | null) {
		if (attribute == 'src') {
			// Source changed after attached so replace element.
			if (this.isConnected && this.loading == 'eager') {
				this.handleData()
			}
		} else if (attribute == 'loading') {
			// Loading mode changed to Eager after attached so replace element.
			if (this.isConnected && oldVal != 'eager' && this.loading == 'eager') {
				this.handleData()
			}
		}
	}

	constructor() {
		super()
		this.attachShadow({ mode: 'open' }).innerHTML = `
			<style>
				:host {
					display: block;
				}
			</style>
			<slot></slot>`
	}

	connectedCallback() {
		if (this.src && this.loading == 'eager') {
			this.handleData()
		}
		if (this.loading == 'lazy') {
			this.observer.observe(this)
		}
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
		data = src ? this.fetchDataWithEvents() : Promise.reject(new Error('missing src'))
		loaded.set(this, { src, data })
		return data
	}

	private observer = new IntersectionObserver(
		entries => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const { target } = entry
					this.observer.unobserve(target)
					if (target instanceof IncludeFragmentElement && target.loading == 'lazy')
						this.handleData()
				}
			}
		},
		{
			// Currently the threshold is set to 256px from the bottom of the viewport
			// with a threshold of 0.1. This means the element will not load until about
			// 2 keyboard-down-arrow presses away from being visible in the viewport,
			// giving us some time to fetch it before the contents are made visible
			rootMargin: '0 0 256px 0',
			threshold: 0.01
		}
	)

	private handleData() {
		if (this.busy) return Promise.resolve()
		this.busy = true

		this.observer.unobserve(this)
		return this.load().then(
			(html: string) => {
				const template = document.createElement('template')
				template.innerHTML = html
				const fragment = document.importNode(template.content, true)
				const canceled = !this.dispatchEvent(
					new CustomEvent('include-fragment-replace', { cancelable: true, detail: { fragment } })
				)
				if (!canceled) {
					this.replaceWith(fragment)
					this.dispatchEvent(new CustomEvent('include-fragment-replaced'))
				}
			},
			() => this.classList.add('is-error')
		)
	}

	private fetchDataWithEvents() {
		// We mimic the same event order as <img>, including the spec
		// which states events must be dispatched after "queue a task".
		// https://www.w3.org/TR/html52/semantics-embedded-content.html#the-img-element
		return task()
			.then(() => {
				this.dispatchEvent(new Event('loadstart'))
				return fetch(this.request())
			})
			.then(response => {
				if (response.status != 200) {
					throw new Error(`Failed to load resource: the server responded with a status of ${response.status}`)
				}
				const ct = response.headers.get('Content-Type')
				if (!isWildcard(this.accept) && (!ct || !ct.includes(this.accept))) {
					throw new Error(`Failed to load resource: expected ${this.accept} but was ${ct}`)
				}
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
			)
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'include-fragment': IncludeFragmentElement
	}
}

customElements.define('include-fragment', IncludeFragmentElement)