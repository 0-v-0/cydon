import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Cydon } from '../index'
import { tick } from './setup'

/**
 * Keyed c-for: a `:key` expression on the template makes DOM nodes track
 * items across reorders, insertions and removals. The tests below mirror
 * the three checks of js-framework-benchmark's isKeyed detector (swap
 * moves the original nodes, full replace adds and removes, remove takes
 * the stored node out) plus the cydon-specific interactions.
 */
describe('c-for keyed', () => {
	let container: HTMLElement
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	type Row = { id: number, v: string, show?: boolean }
	const build = (n: number): Row[] =>
		Array.from({ length: n }, (_, i) => ({ id: i + 1, v: 'v' + (i + 1), show: true }))

	/** map of item id -> rendered <i> node, resolved by text content */
	const nodeById = (root: HTMLElement) => {
		const map = new Map<string, HTMLElement>()
		for (const el of root.querySelectorAll('i'))
			map.set(el.textContent!, el)
		return map
	}
	const order = (root: HTMLElement) =>
		[...root.querySelectorAll('i')].map(el => el.textContent)

	test('renders items in order on mount', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		expect(order(container)).toEqual(['v1', 'v2', 'v3'])
	})

	test('swap moves the original nodes instead of recreating them', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const before = nodeById(container)

		app.$data.items = [rows[2], rows[1], rows[0]]
		await tick()
		expect(order(container)).toEqual(['v3', 'v2', 'v1'])
		const after = nodeById(container)
		// every row keeps its original DOM node — only moved
		for (const [v, el] of before)
			expect(after.get(v)).toBe(el)
	})

	test('full replace removes old nodes and creates new ones', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const old = [...nodeById(container).values()]

		app.$data.items = build(2).map(r => ({ id: r.id + 100, v: r.v }))
		await tick()
		expect(order(container)).toEqual(['v1', 'v2'])
		for (const el of old)
			expect(el.isConnected).toBe(false)
	})

	test('remove drops exactly the deleted row node, survivors keep theirs', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const before = nodeById(container)

		app.$data.items.splice(1, 1) // remove v2 via the shared proxy
		await tick()
		expect(order(container)).toEqual(['v1', 'v3'])
		expect(before.get('v2')!.isConnected).toBe(false)
		expect(before.get('v1')).toBe(nodeById(container).get('v1'))
		expect(before.get('v3')).toBe(nodeById(container).get('v3'))
	})

	test('insert lands at the right position without disturbing survivors', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const before = nodeById(container)

		app.$data.items = [rows[0], { id: 9, v: 'v9' }, rows[1], rows[2]]
		await tick()
		expect(order(container)).toEqual(['v1', 'v9', 'v2', 'v3'])
		const after = nodeById(container)
		for (const v of ['v1', 'v2', 'v3'])
			expect(after.get(v)).toBe(before.get(v))
	})

	test('two index writes batch into one move-based swap', async () => {
		// The benchmark's swap pattern: clone one row (same id, new object),
		// then write both positions — the intermediate state must never be
		// diffed, or the swapped items would be destroyed and recreated.
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const before = nodeById(container)
		const shared = app.$data.items

		const a = { ...shared[2] } // clone of v3: same id, new object
		shared[2] = shared[0]
		shared[0] = a
		await tick()
		expect(order(container)).toEqual(['v3', 'v2', 'v1'])
		const after = nodeById(container)
		for (const [v, el] of before)
			expect(after.get(v)).toBe(el)
	})

	test('same key with a fresh object updates data and keeps the node', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(2)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const el = nodeById(container).get('v2')!

		app.$data.items[1] = { id: 2, v: 'changed' }
		await tick()
		expect(order(container)).toEqual(['v1', 'changed'])
		expect(nodeById(container).get('changed')).toBe(el)
	})

	test('in-place mutation through the shared proxy stays reactive', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		app.$data.items = build(2)
		app.mount(container)
		await tick()
		const el = nodeById(container).get('v2')!

		app.$data.items[1].v = 'updated'
		await tick()
		expect(order(container)).toEqual(['v1', 'updated'])
		expect(nodeById(container).get('updated')).toBe(el)
	})

	test('index variable is refreshed for every scope after a structural change', async () => {
		container.innerHTML =
			'<template c-for="item, i; items" :key="item.id"><i>$i: $item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		expect(order(container)).toEqual(['0: v1', '1: v2', '2: v3'])

		app.$data.items.splice(0, 1)
		await tick()
		expect(order(container)).toEqual(['0: v2', '1: v3'])
	})

	test('items moved with a c-if inside keep working bindings', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id">' +
			'<b c-if="item.show">$item.v</b><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		rows[1].show = false
		app.$data.items = rows
		app.mount(container)
		await tick()
		expect(order(container)).toEqual(['v1', 'v2', 'v3'])
		expect([...container.querySelectorAll('b')].map(b => b.textContent))
			.toEqual(['v1', 'v3'])

		app.$data.items = [rows[2], rows[1], rows[0]]
		await tick()
		expect(order(container)).toEqual(['v3', 'v2', 'v1'])
		expect([...container.querySelectorAll('b')].map(b => b.textContent))
			.toEqual(['v3', 'v1'])

		// the re-rendered c-if lands inside the right (moved) item
		app.$data.items[1].show = true
		await tick()
		expect([...container.querySelectorAll('b')].map(b => b.textContent))
			.toEqual(['v3', 'v2', 'v1'])
	})

	test('static siblings keep their position across keyed operations', async () => {
		container.innerHTML =
			'<p class="keep">static</p>' +
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(2)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const p = container.querySelector('p')!

		app.$data.items = [rows[1], rows[0]]
		await tick()
		expect(order(container)).toEqual(['v2', 'v1'])
		expect(container.querySelector('p')).toBe(p)
		expect(p.textContent).toBe('static')

		app.$data.items = []
		await tick()
		expect(container.querySelectorAll('i')).toHaveLength(0)
		expect(container.querySelector('p')).toBe(p)
	})

	test('primitive items keyed by value reuse their nodes', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item"><i>$item</i></template>'
		const app = new Cydon<{ items: number[] }>()
		app.$data.items = [1, 2, 3]
		app.mount(container)
		await tick()
		const before = nodeById(container)

		app.$data.items = [3, 1, 2]
		await tick()
		expect(order(container)).toEqual(['3', '1', '2'])
		const after = nodeById(container)
		for (const [v, el] of before)
			expect(after.get(v)).toBe(el)
	})

	test('two keyed loops over one array reconcile together', async () => {
		container.innerHTML =
			'<div id="a"><template c-for="item; items" :key="item.id"><i>$item.v</i></template></div>' +
			'<div id="b"><template c-for="item; items" :key="item.id"><i>$item.v</i></template></div>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(2)
		app.$data.items = rows
		app.mount(container)
		await tick()
		const a = container.querySelector('#a')!, b = container.querySelector('#b')!
		const aBefore = nodeById(a as HTMLElement), bBefore = nodeById(b as HTMLElement)

		app.$data.items = [rows[1], rows[0]]
		await tick()
		expect(order(a as HTMLElement)).toEqual(['v2', 'v1'])
		expect(order(b as HTMLElement)).toEqual(['v2', 'v1'])
		for (const [v, el] of aBefore)
			expect(nodeById(a as HTMLElement).get(v)).toBe(el)
		for (const [v, el] of bBefore)
			expect(nodeById(b as HTMLElement).get(v)).toBe(el)
	})

	test('direct index reads through the shared proxy follow the new order', async () => {
		container.innerHTML =
			'<p>${items[0].v}</p>' +
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		const rows = build(3)
		app.$data.items = rows
		app.mount(container)
		await tick()
		expect(container.querySelector('p')!.textContent).toBe('v1')

		app.$data.items = [rows[2], rows[1], rows[0]]
		await tick()
		expect(container.querySelector('p')!.textContent).toBe('v3')
	})

	test('duplicate keys warn in dev and surplus occurrences render as new items', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key="item.id"><i>$item.v</i></template>'
		const app = new Cydon<{ items: Row[] }>()
		app.$data.items = build(1)
		app.mount(container)
		await tick()
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		app.$data.items = [{ id: 1, v: 'a' }, { id: 1, v: 'b' }]
		await tick()
		expect(warn).toHaveBeenCalledTimes(1)
		expect(order(container)).toEqual(['a', 'b'])
		warn.mockRestore()
	})

	test('empty :key warns and renders non-keyed', async () => {
		container.innerHTML =
			'<template c-for="item; items" :key=""><i>$item</i></template>'
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = new Cydon<{ items: number[] }>()
		app.$data.items = [1, 2]
		app.mount(container)
		expect(warn).toHaveBeenCalledTimes(1)
		// non-keyed fallback: still renders, position-based
		await tick()
		expect(order(container)).toEqual(['1', '2'])
		warn.mockRestore()
	})
})
