export const aliases = new Map<string, string>()

export function getDialog(hash: string) {
	const target = document.getElementById(parse(hash))
	return target instanceof HTMLDialogElement ? target : null
}

const parse = (hash: string) =>
	(hash = hash.substring(1), aliases.get(hash) || hash)

function hashchange(oldURL = location.href) {
	let old = getDialog(new URL(oldURL).hash)
	const hash = location.hash,
		target = getDialog(hash)
	if (old != target && old?.open)
		old.close()
	if (target && !target.open) {
		target.addEventListener('close', () => {
			const id = parse(location.hash)
			if (id == target.id) {
				history.back()
				if (id == parse(hash))
					location.hash = ''
			}
		}, { once: true })
		target.showModal()
	}
}

document.addEventListener('click', (e: MouseEvent) => {
	const el = <Element>e.target
	if (el instanceof HTMLDialogElement && !el.hasAttribute('blocked')) {
		const r = el.getBoundingClientRect()
		if (e.x < r.left || e.x > r.right ||
			e.y < r.top || e.y > r.bottom)
			el.close()
	}
})

addEventListener('hashchange', e => hashchange(e.oldURL))
setTimeout(hashchange)