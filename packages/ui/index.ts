import { customElement, directives, TargetValue } from 'cydon'
import { isDisabled } from './util'

export * from './util'

export interface VisibleElement {
	show(this: HTMLElement, el?: Element, tab?: Element): void
	hide(this: HTMLElement, el?: Element): void
}

export const hide = (e?: Element | null) => e?.classList.add('hidden'),
	toggle = (e: HTMLElement & VisibleElement) => {
		if (e.classList.contains('hidden'))
			e.show()
		else
			e.hide()
	}

@customElement('c-modal')
export class Modal extends HTMLElement implements VisibleElement {
	constructor() {
		super()
		this.addEventListener('keydown', this.keydown)
	}

	show() {
		this.ariaHidden = null
		this.ariaModal = 'true'
		this.setAttribute('role', 'dialog')
		this.classList.add('show')
		setTimeout(() => {
			this.classList.add('in')
			this.focus()
		}, 150)
		//this.scrollBar.hide()
	}

	hide() {
		this.ariaHidden = 'true'
		this.ariaModal = null
		this.removeAttribute('role')
		this.classList.remove('in')
		setTimeout(() => this.classList.remove('show'), 150)
	}

	keydown(e: KeyboardEvent) {
		if (e.key == 'Escape') {
			e.preventDefault()
			hide(<Element>e.target)
		}
	}
}

@customElement('c-tab')
export class Tab extends HTMLElement implements VisibleElement {
	show(el?: Element, tab?: Element) {
		if (!el) return
		for (const c of this.children) {
			const cls = c.classList
			if (cls.contains('tab')) {
				if (c == tab) {
					cls.add('active')
					c.ariaExpanded = 'true'
				} else {
					cls.remove('active')
					c.ariaExpanded = 'false'
				}
				for (const tab of document.body.querySelectorAll(c.getAttribute('c-target')!))
					if (el != tab)
						this.hide(tab)
			}
		}
		const cls = el.classList
		cls.remove('hidden')
		if (cls.contains('fade'))
			cls.add('in')
	}

	hide(el?: Element) {
		const cls = el?.classList;
		cls?.add('hidden')
		cls?.remove('in')
	}
}

@customElement('c-dropdown')
export class Dropdown extends Modal {
	items!: NodeListOf<Element>
	constructor() {
		super()
		this.updateItems()
	}

	updateItems() {
		this.items = this.querySelectorAll('*:not(.disabled):visible a')
	}

	keydown(e: KeyboardEvent) {
		if (/38|40|27|32/.test(e.which + '') && !/INPUT|TEXTAREA/.test((<HTMLInputElement>e.target).tagName)) {
			super.keydown(e)
			e.preventDefault();
			e.stopPropagation();
			let index = this.items.length
			while (index--) {
				if (this.items[index] == e.target)
					break;
			}
			if (e.which == 38)
				index--; // up
			if (e.which == 40)
				index++; // down
			(<HTMLAnchorElement>this.items[index])?.focus?.()
		}
	}
}

@customElement('c-tooltip')
export class Tooltip extends Modal {
}

directives.unshift(function ({ name, value, ownerElement: el }) {
	if (name == '@click.outside') {
		const func = this.getFunc(value)
		el.addEventListener('click', e => {
			if (e.target != el && !el!.contains(<Node>e.target))
				func(e)
		})
		return true
	}
	return
})

directives.push(({ name, value, ownerElement: el }) => {
	if (name == 'c-open' || name == 'c-close') {
		el.addEventListener('click', e => {
			const el = <HTMLElement>e.currentTarget
			if (el.tagName == 'A' || el.tagName == 'AREA')
				e.preventDefault()
			if (!isDisabled(el)) {
				e.stopPropagation()
				const targets = value ? document.body.querySelectorAll(value) : [el.parentElement!]
				if (name == 'c-open') {
					const parent = el.parentElement
					for (const target of targets) {
						if (target instanceof Modal)
							target.show()
						else if (parent instanceof Tab)
							parent.show(target, el)
						else if (target instanceof Dropdown)
							toggle(<Modal>target)
					}
				} else
					targets.forEach(hide)
			}
		})
		return true
	}
	return
})

directives.push(function ({ name, value, ownerElement: node }) {
	if (name[0] == ':') {
		let data = this.targets.get(node.attributes[<any>name.substring(1)])
		if (!data)
			this.add(data = { node, deps: new Set<string>(), vals: [] })
		for (const cls of value.split(';')) {
			const p = cls.indexOf(':');
			if (~p)
				(<TargetValue[]>data.vals).push(['',
					Function(`with(this){return ${cls.substring(p + 1)}?${cls.substring(0, p)}:''}`)])
		}
		return true
	}
	return
})

export const CustomElements = {
	'c-dropdown': Dropdown,
	'c-modal': Modal,
	'c-tab': Tab,
	'c-tooltip': Tooltip
}

type CustomElements = typeof CustomElements
declare global {
	interface HTMLElementTagNameMap extends CustomElements {
	}
}