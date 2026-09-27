import { describe, expect, test, vi } from 'vitest'
import { compile, Cydon, directives } from '../index'
import type { Results } from '../type'
import { tick } from './setup'

describe('bind diagnostics', () => {
	test('warns when the walk runs past the DOM (bindings silently skipped)', () => {
		const container = document.createElement('div')
		container.innerHTML = '<p>$x</p><p>$x</p>'
		const app = new Cydon()
		;(app as any).x = 1
		const results: Results = []
		compile(results, container, directives)
		// Simulate the DOM being mutated between compile and bind (e.g. detached by c-for/c-if): drop the last bound node
		container.lastChild!.remove()
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		app.bind(results, container)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('bindings skipped'), expect.anything())
		warn.mockRestore()
	})

	test('no warnings on a healthy mount', () => {
		const container = document.createElement('div')
		container.innerHTML = '<p>$x</p><p>$x</p>'
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const app = new Cydon()
		;(app as any).x = 1
		app.mount(container)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('.prop binding (.*prop)', () => {
	test('binds boolean DOM properties reactively', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<button .disabled="busy">x</button>'
		const app = new Cydon()
		app.data.busy = true
		app.mount(container)
		const btn = container.querySelector('button')!
		expect(btn.disabled).toBe(true)

		app.data.busy = false
		await tick()
		expect(btn.disabled).toBe(false)
	})
})
