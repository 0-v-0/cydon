// From https://github.com/github/image-crop-element/blob/main/src/index.ts

const startPositions = new WeakMap<ImageCrop, { startX: number; startY: number }>()
const dragStartPositions = new WeakMap<ImageCrop, { dragStartX: number; dragStartY: number }>()
const constructedElements = new WeakMap<ImageCrop, { image: HTMLImageElement; box: HTMLElement }>()

function moveCropArea(event: TouchEvent | MouseEvent | KeyboardEvent) {
	const el = event.currentTarget
	if (!(el instanceof ImageCrop)) return
	const { box, image } = constructedElements.get(el) || {}
	if (!box || !image) return

	let deltaX = 0
	let deltaY = 0
	if (event instanceof KeyboardEvent) {
		if (event.key == 'ArrowUp') {
			deltaY = -1
		} else if (event.key == 'ArrowDown') {
			deltaY = 1
		} else if (event.key == 'ArrowLeft') {
			deltaX = -1
		} else if (event.key == 'ArrowRight') {
			deltaX = 1
		}
	} else if (dragStartPositions.has(el) && event instanceof MouseEvent) {
		const pos = dragStartPositions.get(el)!
		deltaX = event.pageX - pos.dragStartX
		deltaY = event.pageY - pos.dragStartY
	} else if (dragStartPositions.has(el) && event instanceof TouchEvent) {
		// Only support a single touch at a time
		const { pageX, pageY } = event.changedTouches[0]

		const { dragStartX, dragStartY } = dragStartPositions.get(el)!
		deltaX = pageX - dragStartX
		deltaY = pageY - dragStartY
	}

	if (deltaX !== 0 || deltaY !== 0) {
		const x = Math.min(Math.max(0, box.offsetLeft + deltaX), image.width - box.offsetWidth)
		const y = Math.min(Math.max(0, box.offsetTop + deltaY), image.height - box.offsetHeight)
		box.style.left = x + 'px'
		box.style.top = y + 'px'

		fireChangeEvent(el, { x, y, width: box.offsetWidth, height: box.offsetHeight })
	}

	if (event instanceof MouseEvent) {
		dragStartPositions.set(el, {
			dragStartX: event.pageX,
			dragStartY: event.pageY
		})
	} else if (event instanceof TouchEvent) {
		// Only support a single touch at a time
		const { pageX, pageY } = event.changedTouches[0]
		dragStartPositions.set(el, {
			dragStartX: pageX,
			dragStartY: pageY
		})
	}
}

function updateCropArea(event: TouchEvent | MouseEvent | KeyboardEvent) {
	const target = event.target
	if (!(target instanceof HTMLElement)) return

	const el = getShadowHost(target)
	if (!(el instanceof ImageCrop)) return

	const { box } = constructedElements.get(el) || {}
	if (!box) return

	const rect = el.getBoundingClientRect()
	let deltaX
	let deltaY
	let delta
	if (event instanceof KeyboardEvent) {
		if (event.key == 'Escape') return setInitialPosition(el)
		if (event.key == '-') delta = -10
		if (event.key == '=') delta = +10
		if (!delta) return
		deltaX = box.offsetWidth + delta
		deltaY = box.offsetHeight + delta
		startPositions.set(el, { startX: box.offsetLeft, startY: box.offsetTop })
	} else if (event instanceof MouseEvent) {
		const pos = startPositions.get(el)
		if (!pos) return
		deltaX = event.pageX - pos.startX - rect.left - scrollX
		deltaY = event.pageY - pos.startY - rect.top - scrollY
	} else if (event instanceof TouchEvent) {
		const pos = startPositions.get(el)
		if (!pos) return
		deltaX = event.changedTouches[0].pageX - pos.startX - rect.left - scrollX
		deltaY = event.changedTouches[0].pageY - pos.startY - rect.top - scrollY
	}

	if (deltaX && deltaY) updateDimensions(el, deltaX, deltaY, !(event instanceof KeyboardEvent))
}

function getShadowHost(el: HTMLElement) {
	const rootNode = el.getRootNode()
	return rootNode instanceof ShadowRoot ? rootNode.host : el
}

function startUpdate(event: TouchEvent | MouseEvent) {
	const { currentTarget } = event
	if (!(currentTarget instanceof HTMLElement)) return

	const el = getShadowHost(currentTarget)
	if (!(el instanceof ImageCrop)) return

	const { box } = constructedElements.get(el) || {}
	if (!box) return

	const { target } = event
	if (!(target instanceof HTMLElement)) return

	if (target.hasAttribute('data-direction')) {
		const direction = target.getAttribute('data-direction') || ''
		// Change crop area
		el.addEventListener('mousemove', updateCropArea)
		el.addEventListener('touchmove', updateCropArea, { passive: true })
		if (direction == 'nw' || direction == 'se') el.classList.add('nwse')
		if (direction == 'ne' || direction == 'sw') el.classList.add('nesw')
		startPositions.set(el, {
			startX: box.offsetLeft + (direction == 'se' || direction == 'ne' ? 0 : box.offsetWidth),
			startY: box.offsetTop + (direction == 'se' || direction == 'sw' ? 0 : box.offsetHeight)
		})
		updateCropArea(event)
	} else {
		// Move crop area
		el.addEventListener('mousemove', moveCropArea)
		el.addEventListener('touchmove', moveCropArea, { passive: true })
	}
}

function updateDimensions(target: ImageCrop, deltaX: number, deltaY: number, reposition = true) {
	let newSide = Math.max(Math.abs(deltaX), Math.abs(deltaY), 10)
	const pos = startPositions.get(target)
	if (!pos) return
	const { box, image } = constructedElements.get(target) || {}
	if (!box || !image) return

	newSide = Math.min(
		newSide,
		deltaY > 0 ? image.height - pos.startY : pos.startY,
		deltaX > 0 ? image.width - pos.startX : pos.startX
	)

	const x = reposition ? Math.round(Math.max(0, deltaX > 0 ? pos.startX : pos.startX - newSide)) : box.offsetLeft
	const y = reposition ? Math.round(Math.max(0, deltaY > 0 ? pos.startY : pos.startY - newSide)) : box.offsetTop

	box.style.left = `${x}px`
	box.style.top = `${y}px`

	box.style.width = `${newSide}px`
	box.style.height = `${newSide}px`
	fireChangeEvent(target, { x, y, width: newSide, height: newSide })
}

function setInitialPosition(el: ImageCrop) {
	const { image } = constructedElements.get(el) || {}
	if (!image) return
	const side = Math.round(image.clientWidth > image.clientHeight ? image.clientHeight : image.clientWidth)
	startPositions.set(el, {
		startX: (image.clientWidth - side) / 2,
		startY: (image.clientHeight - side) / 2
	})
	updateDimensions(el, side, side)
}

function stopUpdate(event: TouchEvent | MouseEvent) {
	const el = event.currentTarget
	if (!(el instanceof ImageCrop)) return

	dragStartPositions.delete(el)
	el.classList.remove('nwse', 'nesw')
	el.removeEventListener('mousemove', updateCropArea)
	el.removeEventListener('mousemove', moveCropArea)
	el.removeEventListener('touchmove', updateCropArea)
	el.removeEventListener('touchmove', moveCropArea)
}

interface Result {
	x: number
	y: number
	width: number
	height: number
	[propName: string]: number
}

function fireChangeEvent(target: ImageCrop, result: Result) {
	const { image } = constructedElements.get(target) || {}
	if (!image) return
	const ratio = image.naturalWidth / image.width
	for (const key in result) {
		const value = Math.round(result[key] * ratio)
		result[key] = value
		const slottedInput = target.querySelector(`[data-image-crop-input='${key}']`)
		if (slottedInput instanceof HTMLInputElement) slottedInput.value = value.toString()
	}

	target.dispatchEvent(new CustomEvent('image-crop-change', { bubbles: true, detail: result }))
}

export default class ImageCrop extends HTMLElement {
	connectedCallback() {
		if (constructedElements.has(this)) return

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = `
<style>
	:host { touch-action: none; display: block; }
	:host(.nesw) { cursor: nesw-resize; }
	:host(.nwse) { cursor: nwse-resize; }
	:host(.nesw) .crop-box, :host(.nwse) .crop-box { cursor: inherit; }
	:host([loaded]) .crop-image { display: block; }
	:host([loaded]) ::slotted([data-loading-slot]), .crop-image { display: none; }

	.crop-wrapper {
		position: relative;
		font-size: 0;
	}
	.crop-container {
		user-select: none;
		-ms-user-select: none;
		-moz-user-select: none;
		-webkit-user-select: none;
		position: absolute;
		overflow: hidden;
		z-index: 1;
		top: 0;
		width: 100%;
		height: 100%;
	}

	:host([rounded]) .crop-box {
		border-radius: 50%;
		box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3);
	}
	.crop-box {
		position: absolute;
		border: 1px dashed #fff;
		box-sizing: border-box;
		cursor: move;
	}

	:host([rounded]) .crop-outline {
		outline: none;
	}
	.crop-outline {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		outline: 4000px solid rgba(0, 0, 0, .3);
	}

	.handle { position: absolute; }
	:host([rounded]) .handle::before { border-radius: 50%; }
	.handle:before {
		position: absolute;
		display: block;
		padding: 4px;
		transform: translate(-50%, -50%);
		content: ' ';
		background: #fff;
		border: 1px solid #767676;
	}
	.ne { top: 0; right: 0; cursor: nesw-resize; }
	.nw { top: 0; left: 0; cursor: nwse-resize; }
	.se { bottom: 0; right: 0; cursor: nwse-resize; }
	.sw { bottom: 0; left: 0; cursor: nesw-resize; }
</style>
<slot></slot>
<div class="crop-wrapper">
	<img width="100%" class="crop-image" alt="">
	<div class="crop-container">
		<div data-crop-box class="crop-box">
			<div class="crop-outline"></div>
			<div data-direction="nw" class="handle nw"></div>
			<div data-direction="ne" class="handle ne"></div>
			<div data-direction="sw" class="handle sw"></div>
			<div data-direction="se" class="handle se"></div>
		</div>
	</div>
</div>
`

		const box = shadowRoot.querySelector<HTMLElement>('[data-crop-box]')!
		const image = shadowRoot.querySelector<HTMLImageElement>('img')!
		constructedElements.set(this, { box, image })

		image.addEventListener('load', () => {
			this.loaded = true
			setInitialPosition(this)
		})

		this.addEventListener('mouseleave', stopUpdate)
		this.addEventListener('touchend', stopUpdate)
		this.addEventListener('mouseup', stopUpdate)
		box.addEventListener('mousedown', startUpdate)
		box.addEventListener('touchstart', startUpdate, { passive: true })
		this.addEventListener('keydown', moveCropArea)
		this.addEventListener('keydown', updateCropArea)

		if (this.src) image.src = this.src
	}

	static get observedAttributes() {
		return ['src']
	}

	get src() {
		return this.getAttribute('src')
	}

	set src(val) {
		if (val)
			this.setAttribute('src', val)
		else
			this.removeAttribute('src')
	}

	get loaded() {
		return this.hasAttribute('loaded')
	}

	set loaded(val) {
		if (val)
			this.setAttribute('loaded', '')
		else
			this.removeAttribute('loaded')
	}

	attributeChangedCallback(attribute: string, oldValue: string, newValue: string) {
		const { image } = constructedElements.get(this) || {}
		if (attribute == 'src') {
			this.loaded = false
			if (image) image.src = newValue
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'image-crop': ImageCrop
	}
}

customElements.define('image-crop', ImageCrop)
