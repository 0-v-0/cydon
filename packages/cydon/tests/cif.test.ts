import { beforeEach, describe, expect, test } from 'vitest'
import { Cydon } from '../index'
import { tick } from './setup'

/**
 * Regression coverage for the c-if rework: one anchor comment per element
 * (not per compiled part), fragment-safe insertion while a c-for item is
 * still unattached, and toggle cycles that keep the directive's own
 * binding alive.
 */
describe('c-if', () => {
	let container: HTMLElement
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	test('c-if binds as a direct child of a c-for template (item in a fragment)', () => {
		container.innerHTML =
			'<template c-for="item; items"><b c-if="item.show">$item.v</b><i>$item.v</i></template>'
		const app = new Cydon<{ items: { v: string, show: boolean }[] }>()
		app.$data.items = [
			{ v: 'a', show: true },
			{ v: 'b', show: false },
			{ v: 'c', show: true },
		]
		// previously: parentElement is null while the item is a fragment child
		expect(() => app.mount(container)).not.toThrow()
	})

	test('each c-for item swaps its own anchor, toggling independently', async () => {
		container.innerHTML =
			'<template c-for="item; items"><b c-if="item.show">$item.v</b><i>$item.v</i></template>'
		const app = new Cydon<{ items: { v: string, show: boolean }[] }>()
		app.$data.items = [
			{ v: 'a', show: true },
			{ v: 'b', show: false },
			{ v: 'c', show: true },
		]
		app.mount(container)
		const texts = () => [...container.querySelectorAll('b')].map(b => b.textContent)
		expect(texts()).toEqual(['a', 'c'])

		// one shared anchor used to make these swaps hijack each other
		app.$data.items[1].show = true
		await tick()
		expect(texts()).toEqual(['a', 'b', 'c'])

		app.$data.items[0].show = false
		await tick()
		expect(texts()).toEqual(['b', 'c'])

		app.$data.items[0].show = true
		await tick()
		expect(texts()).toEqual(['a', 'b', 'c'])
	})

	test('toggle cycles keep working on instances whose data is the element', async () => {
		// data === instance: unmount(el) used to drop the c-if target itself
		// (a node contains itself), freezing the directive after one toggle
		container.innerHTML = '<p c-if="show">$x</p>'
		const app = new Cydon<{ show: boolean, x: string }>()
		app.$data.show = false
		app.$data.x = 'X'
		app.mount(container)
		expect(container.querySelector('p')).toBeNull()

		// writes go through the data proxy to stay reactive
		app.data.show = true
		await tick()
		expect(container.querySelector('p')!.textContent).toBe('X')

		// the hidden element keeps its bindings and re-appears current
		app.data.show = false
		await tick()
		expect(container.querySelector('p')).toBeNull()
		app.data.x = 'Y'
		app.data.show = true
		await tick()
		expect(container.querySelector('p')!.textContent).toBe('Y')
	})
})
