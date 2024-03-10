export type Status = '' | 'pending' | 'loaded' | 'error'

export const observer = new IntersectionObserver(
	entries => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const { target } = entry
				if (target instanceof AsyncLoad && target.lazy)
					target.load()
			}
		}
	},
	{
		// Currently the threshold is set to 256px from the bottom of the viewport
		// with a threshold of 0.01. This means the element will not load until about
		// 2 keyboard-down-arrow presses away from being visible in the viewport,
		// giving us some time to fetch it before the contents are made visible
		rootMargin: '0px 0px 256px 0px',
		threshold: 0.01
	}
)

/**
 * async loader component
 */
export class AsyncLoad extends HTMLElement {
	static observedAttributes = ['lazy', 'load']

	#status: Status = 'pending'
	#loader?: () => any
	#slots

	get status() {
		return this.#status
	}
	set status(val: Status) {
		if (val == 'pending') {
			val = ''
		}
		console.assert(val == '' || val == 'loaded' || val == 'error')
		this.#status = val
		if (!val)
			observer.observe(this)
		for (const slot of this.#slots) {
			slot.style.display = slot.name == val ? '' : 'none'
		}
	}

	get lazy() { return this.hasAttribute('lazy') }

	set lazy(val) { this.toggleAttribute('lazy', val) }

	get loader() { return this.#loader }

	set loader(val) {
		this.#loader = val
		if (this.isConnected && !this.lazy)
			this.load()
	}

	constructor() {
		super()
		const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
		shadow.innerHTML += `<slot></slot>
			<slot name="loaded"></slot>
			<slot name="error"></slot>`
		this.#slots = shadow.querySelectorAll('slot')
	}

	attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
		if (name == 'load')
			this.loader = this.createFunc(newVal)
		else if (this.isConnected && !this.lazy)
			this.load()
	}

	connectedCallback() {
		if (this.lazy)
			observer.observe(this)
		else
			this.load()
	}

	async load() {
		try {
			this.status = 'pending'
			observer.unobserve(this)
			const val = await this.#loader!()
			this.status = 'loaded'
			return val
		} catch (e) {
			this.status = 'error'
			throw e
		}
	}

	retry(e: Event) {
		e.preventDefault()
		if (this.status == 'error')
			this.status = 'pending'
	}

	createFunc(code: string): () => any {
		return Function(`with(this){return ${code}}`).bind(this)
	}
}
