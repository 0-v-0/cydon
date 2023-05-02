// From https://github.com/XboxYan/xy-ui/blob/master/components/xy-message.js

export class Message extends HTMLElement {
	timer?: number | NodeJS.Timeout
	messageType?: null

	constructor() {
		super()
		this.attachShadow({ mode: 'open' }).innerHTML = `
		<style>
		:host{
			display:flex;
			visibility:hidden;
			opacity:0;
			pointer-events:all;
			transform: translate(-50%,-100%);
		}
		:host([open]){
			opacity:1;
			visibility:visible;
			transform: translate(-50%,0);
		}
		</style>
		<slot></slot>
		`
	}

	get open() { return this.hasAttribute('open') }

	set open(val) { this.toggleAttribute('open', val) }

	get type() { return this.getAttribute('type') }

	set type(val) { this.setAttribute('type', val!) }

	connectedCallback() {
		this.messageType = null
		this.addEventListener('transitionend', ev => {
			if ((<TransitionEvent>ev).propertyName == 'transform' && !this.open) {
				this.remove()
				this.dispatchEvent(new CustomEvent('close'))
			}
		})
		this.addEventListener('click', () => this.open = false)
	}
}

customElements.define('c-message', Message)

let messageContent = document.getElementById('message-content')!
if (!messageContent) {
	messageContent = document.createElement('div')
	messageContent.id = 'message-content'
	messageContent.style.cssText = 'position:fixed; pointer-events:none; left:50%; top:1em; z-index:9999;'
	document.body.appendChild(messageContent)
}

const create = () => {
	for (const c of messageContent.children) {
		const msg = <Message>c;
		msg.timer && clearTimeout(msg.timer)
		if (msg.open === false)
			return msg
	}
	return messageContent.appendChild(new Message)
}

export const
	info = (text = '', duration = 3000) => {
		const msg = create()
		msg.type = 'info'
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	},

	success = (text = '', duration = 3000) => {
		const msg = create()
		msg.type = 'success'
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	},

	error = (text = '', duration = 3000) => {
		const msg = create()
		msg.type = 'error'
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	},

	warning = (text = '', duration = 3000) => {
		const msg = create()
		msg.type = 'warning'
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	},

	loading = (text = '', duration = 0) => {
		const msg = create()
		msg.type = 'loading'
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		if (duration)
			msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	},

	show = ({ text = '', duration = 3000 }) => {
		const msg = create()
		msg.textContent = text
		msg.clientWidth
		msg.open = true
		if (duration)
			msg.timer = setTimeout(() => msg.open = false, duration)
		return msg
	}

declare global {
	interface HTMLElementTagNameMap {
		'c-message': Message
	}
}