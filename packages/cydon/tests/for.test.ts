import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Cydon } from '../index'
import { tick } from './setup'

describe('c-for capacity management', () => {
	let container: HTMLElement
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	test('clear removes only rendered items and keeps static siblings', async () => {
		container.innerHTML = '<p class="keep">static</p><template c-for="item; items"><span>${item}</span></template>'
		const app = new Cydon()
		;(app as any).items = [1, 2, 3]
		app.mount(container)
		expect(container.querySelectorAll('span')).toHaveLength(3)
		expect(container.querySelector('p')!.textContent).toBe('static')

		;(app as any).items = []
		await tick()
		expect(container.querySelectorAll('span')).toHaveLength(0)
		expect(container.querySelector('p')!.textContent).toBe('static')

		;(app as any).items = [4]
		await tick()
		expect(container.querySelectorAll('span')).toHaveLength(1)
		expect(container.querySelector('p')!.textContent).toBe('static')
	})

	test('clear drops whitespace-only text nodes along with items (fast path)', async () => {
		container.innerHTML = '\n\t<template c-for="item; items"><span>${item}</span></template>\n'
		const app = new Cydon()
		;(app as any).items = [1, 2]
		app.mount(container)
		await tick()
		expect(container.querySelectorAll('span')).toHaveLength(2)

		;(app as any).items = []
		await tick()
		// Nothing but rendered items and whitespace left -> replaceChildren fast path clears everything
		expect(container.childNodes).toHaveLength(0)
	})

	test('shrink removes only trailing rendered items', async () => {
		container.innerHTML = '<b class="keep">static</b><template c-for="item; items"><i>${item}</i></template>'
		const app = new Cydon()
		;(app as any).items = ['a', 'b', 'c', 'd']
		app.mount(container)
		expect(container.querySelectorAll('i')).toHaveLength(4)

		;(app as any).items = ['a', 'b']
		await tick()
		const items = [...container.querySelectorAll('i')].map((i) => i.textContent)
		expect(items).toEqual(['a', 'b'])
		expect(container.querySelector('b')!.textContent).toBe('static')
	})

	test('two c-for templates sharing one parent do not remove each other\'s items', async () => {
		container.innerHTML = [
			'<template c-for="a; listA"><em>${a}</em></template>',
			'<template c-for="b; listB"><u>${b}</u></template>',
		].join('')
		const app = new Cydon()
		;(app as any).listA = ['a1']
		;(app as any).listB = ['b1', 'b2']
		app.mount(container)
		expect(container.querySelectorAll('em')).toHaveLength(1)
		expect(container.querySelectorAll('u')).toHaveLength(2)

		// Clearing listA must not take listB's rendered items with it
		;(app as any).listA = []
		await tick()
		expect(container.querySelectorAll('em')).toHaveLength(0)
		expect(container.querySelectorAll('u')).toHaveLength(2)
	})

	test('template is removed when mount returns', async () => {
		container.innerHTML = '<template c-for="a; listA"><em>${a}</em></template>'
		const app = new Cydon()
		;(app as any).listA = [1]
		app.mount(container)
		await tick()
		expect(container.querySelector('template')).toBeNull()
		expect(container.querySelector('em')).not.toBeNull()
	})

	test('no warnings on healthy patterns', () => {
		container.innerHTML = '<ul><template c-for="item; items"><li>${item}</li></template></ul>'
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = new Cydon()
		;(app as any).items = [1]
		const ul = container.querySelector('ul')!
		app.mount(ul)
		expect(warn).not.toHaveBeenCalled()
		expect(ul.querySelectorAll('li')).toHaveLength(1)

		// Static siblings no longer warn either — the destructive clear is fixed (see docs for semantics)
		container.innerHTML = '<p class="keep">static</p><template c-for="item; items"><span>${item}</span></template>'
		;(app as any).items = [1]
		app.mount(container)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('c-for over the same array from two loops', () => {
	let container: HTMLElement
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	test('reassigning the array updates both loops', async () => {
		container.innerHTML =
			'<div id="first"><template c-for="pc; pairCards"><span class="first">${pc.name}</span></template></div>' +
			'<div id="second"><template c-for="pc; pairCards"><span class="second">${pc.name}</span></template></div>'
		const app = new Cydon()
		;(app as any).pairCards = [{ name: 'x1' }, { name: 'x2' }]
		app.mount(container)
		expect(container.querySelectorAll('span.first')).toHaveLength(2)
		expect(container.querySelectorAll('span.second')).toHaveLength(2)

		// Regression: the second defineProperty used to replace the first one,
		// freezing the earlier-registered loop on its mount-time content
		;(app as any).data.pairCards = [{ name: 'y1' }, { name: 'y2' }]
		await tick()
		const texts = (sel: string) => [...container.querySelectorAll(sel)].map(s => s.textContent)
		expect(texts('span.first')).toEqual(['y1', 'y2'])
		expect(texts('span.second')).toEqual(['y1', 'y2'])
	})

	test('in-place mutation via the shared proxy updates both loops', async () => {
		container.innerHTML =
			'<div><template c-for="a; listA"><i class="one">${a}</i></template></div>' +
			'<div><template c-for="a; listA"><i class="two">${a}</i></template></div>'
		const app = new Cydon()
		;(app as any).listA = [1]
		app.mount(container)
		expect(container.querySelectorAll('i')).toHaveLength(2)

		;(app as any).data.listA.push(2)
		await tick()
		expect(container.querySelectorAll('i.one')).toHaveLength(2)
		expect(container.querySelectorAll('i.two')).toHaveLength(2)

		;(app as any).data.listA.length = 1
		await tick()
		expect(container.querySelectorAll('i.one')).toHaveLength(1)
		expect(container.querySelectorAll('i.two')).toHaveLength(1)
	})

	test('loops over the same array keep independent scopes', async () => {
		container.innerHTML =
			'<div><template c-for="item; items"><em class="p" c-show="item.show">${item.v}</em></template></div>' +
			'<div><template c-for="item; items"><em class="q">${item.v}</em></template></div>'
		const app = new Cydon()
		;(app as any).items = [{ v: 'a', show: true }, { v: 'b', show: false }]
		app.mount(container)
		// c-show only toggles display while the element stays in the DOM —
		// assert on visibility instead of presence
		const visible = (sel: string) => [...container.querySelectorAll(sel)]
			.filter(e => (e as HTMLElement).style.display != 'none')
		expect(visible('em.p').map(e => e.textContent)).toEqual(['a'])
		expect(visible('em.q').map(e => e.textContent)).toEqual(['a', 'b'])

		// each loop's c-show evaluates against its own scope, independently
		;(app as any).data.items = [{ v: 'c', show: false }, { v: 'd', show: true }]
		await tick()
		expect(visible('em.p').map(e => e.textContent)).toEqual(['d'])
		expect(visible('em.q').map(e => e.textContent)).toEqual(['c', 'd'])
	})
})
