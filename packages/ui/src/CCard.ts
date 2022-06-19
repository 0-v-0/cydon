import { customElement, CydonElement } from 'cydon'
import { getSlotElementNodes, querySlot, isTargetElement } from '../util'

@customElement('c-card')
export class CCard extends HTMLElement {
	constructor() {
		super()
		for (const el of this.shadowRoot!.querySelector<HTMLSlotElement>('slot#content')!.assignedNodes()) {
			if (isFlushListGroupElement(el)) {
				handleTopBorder(<HTMLElement>el);
				handleBottomBorder(<HTMLElement>el);
			}
		}
	}
}

const handleTopBorder = (slot: HTMLElement) => {
	const prevElement = slot.previousElementSibling;
	(prevElement ?
		isTargetElement(prevElement, 'c-card-header') ?
			removeListGroupTopBorder :
			addListGroupTopBorder
		: removeListGroupTopBorder)(slot)
}

const handleBottomBorder = (slot: HTMLElement) => {
	(slot.nextElementSibling ?
		addListGroupBottomBorder
		: addListGroupBottomBorderRadius)(slot)
}

const removeListGroupTopBorder = (el: HTMLElement) => {
	el.style.setProperty('--flush-list-group-item-top-border', '0')
	el.style.setProperty('--flush-list-group-item-top-left-radius', '0.25rem')
	el.style.setProperty('--flush-list-group-item-top-right-radius', '0.25rem')
}

const addListGroupTopBorder = (el: HTMLElement) =>
	el.style.setProperty('--flush-list-group-item-top-border', '1px solid rgba(0, 0, 0, 0.125)')

const addListGroupBottomBorder = (el: HTMLElement) =>
	el.style.setProperty('--flush-list-group-item-bottom-border', '1px solid rgba(0, 0, 0, 0.125)')

const addListGroupBottomBorderRadius = (el: HTMLElement) => {
	el.style.setProperty('--flush-list-group-item-bottom-left-radius', '0.25rem')
	el.style.setProperty('--flush-list-group-item-bottom-right-radius', '0.25rem')
}

const isFlushListGroupElement = (el: Node) =>
	el.nodeType == 1 /* Node.ELEMENT_NODE */ &&
	((<Element>el).localName == 'c-list-group-flush'
		|| (<Element>el).localName == 'c-list-group-action-flush')

@customElement('c-card-body')
export class CCardBody extends HTMLElement {
	constructor() {
		super()
		const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot#plainSlot')
		const slotNodes = getSlotElementNodes(slot!)
		const cardLinksSlot = querySlot(this, 'card-links')
		const cardLinksNodes = getSlotElementNodes(cardLinksSlot!)

		// if nothing was added to the slot node and to the card links node,
		// then find the last element of the card-text and change the margin-bottom
		if (slotNodes.length == 0 && cardLinksNodes.length == 0) {
			const cardText = this._findCardTextElement()
			if (cardText) {
				const children = cardText.children;
				(<HTMLElement>children[children.length - 1]).style.marginBottom = '0'
			}
		}
	}

	_findCardTextElement(): Element | void {
		for (const slotItem of querySlot(this, 'card-text')!.assignedNodes()) {
			if (isTargetElement(slotItem, 'c-card-text'))
				return <Element>slotItem
		}
	}
}

@customElement('c-card-link')
export class CCardLink extends CydonElement {
	label
	target
	constructor() {
		super()
		this.label = this.getAttribute('label') || ''
		this.target = this.getAttribute('target') || '#'
		this.bind()
	}
}

@customElement('c-card-links')
export class CCardLinks extends HTMLElement {
	constructor() {
		super()
		for (const el of this.children) {
			if (isTargetElement(el, 'c-card-link')) {
				const prevElement = el.previousElementSibling;
				(prevElement ?
					isTargetElement(prevElement, 'c-card-link') ?
						addLeftMarginToCardLink :
						removeLeftMarginToCardLink
					: removeLeftMarginToCardLink)(<HTMLElement>el)
			}
		}
	}
}

const removeLeftMarginToCardLink = (el: HTMLElement) =>
	el.style.setProperty('--card-link-left-margin', '0')

const addLeftMarginToCardLink = (el: HTMLElement) =>
	el.style.setProperty('--card-link-left-margin', '1.25rem')

declare global {
	interface HTMLElementTagNameMap {
		'c-card': CCard,
		'c-card-body': CCardBody,
		'c-card-link': CCardLink
		'c-card-links': CCardLinks
	}
}