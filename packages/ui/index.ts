import { Constructor, customElement } from 'cydon/element';
import { bindAll, isDisabled } from './util';

export * from './util';

export class VisibleElement {
	show(this: HTMLElement) {
		let cls = this.classList;
		cls.remove('hidden')
		cls.add('show')
	}
	hide(this: HTMLElement) {
		let cls = this.classList;
		cls.remove('show')
		cls.add('hidden')
	}
	toggle(this: HTMLElement & VisibleElement) {
		if (this.classList.contains('show'))
			this.hide()
		else
			this.show()
	}
}

export type Class = Constructor<{}>;

export interface ExtendedType extends Class {
	prototype?: {};
}

export const mixin = <T extends Class, E extends ExtendedType>(base: T, e: E) => {
	return class extends base {
		constructor(...args: any[]) {
			super(...args);
			Object.assign(this, e.prototype ? e.call(this) : e)
		}
	} as T & Omit<E, 'prototype'>;
}, hide = (e?: Element | null) => e?.classList.add('hidden');

export class Clickable extends EventTarget {
	onClick!: EventListenerOrEventListenerObject | null;
	constructor() {
		super();
		this.addEventListener('click', this.onClick);
	}
}

@customElement('c-close', { extends: 'button' })
export class CClose extends mixin(mixin(HTMLButtonElement, VisibleElement), Clickable) {
	constructor() {
		super();
		this.addEventListener('click', e => {
			let el = e.currentTarget as HTMLElement;
			if (el == this && !isDisabled(el)) {
				hide(el.parentElement);
				e.stopPropagation();
			}
		})
	}

	onClick(this: Clickable & HTMLElement, e: Event) {
		let el = e.currentTarget as HTMLElement;
		if (el == this && !isDisabled(el)) {
			hide(el.parentElement);
			e.stopPropagation();
		}
	}
}

@customElement('c-modal')
export class Modal extends mixin(HTMLElement, VisibleElement) {
	constructor() {
		super();
		this.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key == 'Escape') {
				e.preventDefault();
				hide(e.target as Element);
			}
		})
	}

	show() {
		this.ariaHidden = null;
		this.ariaModal = 'true';
		this.setAttribute('role', 'dialog')
		this.classList.add('show')
		setTimeout(() => {
			this.classList.add('in')
			this.focus()
		}, 150);
		//this.scrollBar.hide()
	}
	hide() {
		this.ariaHidden = 'true';
		this.ariaModal = null;
		this.removeAttribute('role')
		this.classList.remove('in')
		setTimeout(() => this.classList.remove('show'), 150);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'c-close': CClose
		'c-modal': Modal
		'c-tooltip': Tooltip
	}
}

export class Tab extends mixin(HTMLElement, VisibleElement) {
	show(el?: Element, tab?: Element) {
		if (!el) return;
		for (let c of this.children)
			if (c.classList.contains('tab')) {
				if (c == tab)
					c.classList.add('active');
				else
					c.classList.remove('active');
				let targets = document.body.querySelectorAll(c.getAttribute('c-target')!);
				for (let target of targets)
					if (el != target)
						this.hide(target);
			}
		let cls = el.classList;
		cls.remove('hidden');
		cls.add('show');
	}

	hide(el?: Element) {
		if (!el) return;
		let cls = el.classList;
		cls.remove('show');
		cls.add('hidden');
	}
}

@customElement('c-tooltip')
export class Tooltip extends Modal {
}

bindAll('[c-target]', 'click', e => {
	let el = e.currentTarget as HTMLElement;
	if (el.tagName == 'A')
		e.preventDefault();
	if (isDisabled(el))
		return;
	let targets = document.body.querySelectorAll(el.getAttribute('c-target')!);
	if (el.classList.contains('close'))
		targets.forEach(hide);
})
