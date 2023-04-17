// From https://github.com/github/file-attachment-element/blob/main/src/file-attachment-element.ts

import Attachment from '../Attachment'

export { Attachment }

export class FileAttachment extends HTMLElement {
	connectedCallback() {
		this.addEventListener('dragenter', onDragenter)
		this.addEventListener('dragover', onDragenter)
		this.addEventListener('dragleave', onDragleave)
		this.addEventListener('drop', onDrop)
		this.addEventListener('paste', onPaste)
		this.addEventListener('change', onChange)
	}

	disconnectedCallback() {
		this.removeEventListener('dragenter', onDragenter)
		this.removeEventListener('dragover', onDragenter)
		this.removeEventListener('dragleave', onDragleave)
		this.removeEventListener('drop', onDrop)
		this.removeEventListener('paste', onPaste)
		this.removeEventListener('change', onChange)
	}

	get directory() {
		return this.hasAttribute('directory')
	}

	set directory(value) {
		if (value)
			this.setAttribute('directory', '')
		else
			this.removeAttribute('directory')
	}

	async attach(transferred: File[] | Attachment[] | FileList | DataTransfer) {
		const attachments =
			transferred instanceof DataTransfer
				? await Attachment.traverse(transferred, this.directory)
				: Attachment.from(transferred)

		const accepted = this.dispatchEvent(new CustomEvent('file-attachment-accept', {
			bubbles: true,
			cancelable: true,
			detail: { attachments }
		}))

		if (accepted && attachments.length) {
			this.dispatchEvent(new CustomEvent('file-attachment-accepted', {
				bubbles: true,
				detail: { attachments }
			}))
		}
	}
}

const hasFile = (transfer: DataTransfer) => transfer.types.includes('Files')

let dragging: number | NodeJS.Timeout | undefined

// Highlight textarea and change drop cursor. Ensure drop target styles
// are cleared after dragging back outside of window.
function onDragenter(event: DragEvent) {
	const target = <Element>event.currentTarget

	if (dragging)
		clearTimeout(dragging)

	dragging = setTimeout(() => target.removeAttribute('hover'), 200)

	const transfer = event.dataTransfer
	if (!transfer || !hasFile(transfer)) return

	transfer.dropEffect = 'copy'
	target.setAttribute('hover', '')

	event.preventDefault()
}

// Unhighlight textarea and remove drop cursor.
function onDragleave(event: DragEvent) {
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = 'none'
	}

	const target = <Element>event.currentTarget
	target.removeAttribute('hover')

	event.stopPropagation()
	event.preventDefault()
}

function onDrop(event: DragEvent) {
	const container = event.currentTarget
	if (!(container instanceof FileAttachment)) return

	container.removeAttribute('hover')

	const transfer = event.dataTransfer
	if (!transfer || !hasFile(transfer)) return

	container.attach(transfer)
	event.stopPropagation()
	event.preventDefault()
}

const images = /^image\/(avif|gif|png|jpeg)$/

const pastedFile = (items: DataTransferItemList) => {
	for (const item of items) {
		if (item.kind == 'file' && images.test(item.type))
			return item.getAsFile()
	}
	return null
}

function onPaste(event: ClipboardEvent) {
	if (!event.clipboardData?.items) return

	const container = event.currentTarget
	if (!(container instanceof FileAttachment)) return

	const file = pastedFile(event.clipboardData.items)
	if (file) {
		container.attach([file])
		event.preventDefault()
	}
}

function onChange(event: Event) {
	const container = event.currentTarget
	if (!(container instanceof FileAttachment)) return
	const input = event.target
	if (!(input instanceof HTMLInputElement)) return

	const id = container.getAttribute('input')
	if (input.id == id) {
		const files = input.files
		if (files && files.length) {
			container.attach(files)
			input.value = ''
		}
	}
}
customElements.define('file-attachment', FileAttachment)

declare global {
	interface HTMLElementTagNameMap {
		'file-attachment': FileAttachment
	}
}
