// From https://github.com/XboxYan/xy-ui/blob/master/components/xy-message.js

export default class Message extends HTMLElement {
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
			transition:.3s;
			z-index:10;
		}
		:host([open]){
			opacity:1;
			visibility:visible;
		}
		.message{
			margin:auto;
			display:flex;
			padding:10px 15px;
			margin-top:10px;
			align-items:center;
			font-size: 14px;
			color: #666;
			background: #fff;
			border-radius: 3px;
			transform: translateY(-100%);
			transition:.3s transform cubic-bezier(.645, .045, .355, 1);
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			pointer-events:all;
		}
		:host([open]) .message{
			transform: translateY(0);
		}

		.message>*{
			margin-right:5px;
		}
		</style>
		<div class="message">
			<slot></slot>
		</div>
		`
	}

	get open() { return this.hasAttribute('open') }

	set open(val) {
		this.toggleAttribute('open', val)
	}

	get type() { return this.getAttribute('type') }

	set type(val) { this.setAttribute('type', val!) }

	connectedCallback() {
		this.messageType = null
		this.shadowRoot!.addEventListener('transitionend', ev => {
			if ((<TransitionEvent>ev).propertyName == 'transform' && !this.open) {
				messageContent.removeChild(this)
				this.dispatchEvent(new CustomEvent('close'))
			}
		})
	}
}

customElements.define('c-message', Message)

let messageContent = document.getElementById('message-content')!
if (!messageContent) {
	messageContent = document.createElement('div')
	messageContent.id = 'message-content'
	messageContent.style.cssText = 'position:fixed; pointer-events:none; left:0; top:1em; z-index:11;'
	document.body.appendChild(messageContent)
}

const create = () => {
	for (const c of messageContent.children) {
		const msg = <Message>c;
		msg.timer && clearTimeout(msg.timer)
		if (msg.open === false)
			return msg
	}
	return messageContent.appendChild(document.createElement('c-message'))
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