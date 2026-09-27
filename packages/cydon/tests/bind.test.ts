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

describe('mid-bind DOM mutation', () => {
	test('siblings after a false c-if still bind and stay reactive', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<p c-if="show">$x</p><p>$x</p><span c-show="show">$x</span>'
		const app = new Cydon({ show: false, x: 'X' })
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		app.mount(container)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()

		// the c-if element is detached, its sibling keeps its compiled position
		// (the anchor comment replaces it 1:1) and must be bound
		expect(container.querySelectorAll('p')).toHaveLength(1)
		const p = container.querySelector('p')!
		const span = container.querySelector('span')!
		expect(p.textContent).toBe('X')
		app.data.x = 'Y'
		await tick()
		expect(p.textContent).toBe('Y')
		expect(span.textContent).toBe('Y')

		// toggling c-if on re-inserts the element and binds it
		app.data.show = true
		await tick()
		expect(container.querySelectorAll('p')).toHaveLength(2)
		expect(container.querySelectorAll('p')[0].textContent).toBe('Y')
	})

	test('bindings after ascending past a detached c-if ancestor recover', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<section c-if="show"><b>$x</b></section><i>$x</i>'
		const section = container.querySelector('section')!
		const b = section.querySelector('b')!
		const app = new Cydon({ show: false, x: 'X' })
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		app.mount(container)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()

		// <b> inside the detached section is bound, and <i> after the section too
		expect(container.querySelector('section')).toBeNull()
		expect(b.textContent).toBe('X')
		const i = container.querySelector('i')!
		expect(i.textContent).toBe('X')
		app.data.x = 'Y'
		await tick()
		expect(b.textContent).toBe('Y')
		expect(i.textContent).toBe('Y')
	})

	test('siblings after a c-tp template still bind', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<template c-tp="">x</template><p>$x</p>'
		const app = new Cydon({ x: 'X' })
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		app.mount(container)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()

		await tick() // c-tp moves its content in a microtask after bind
		expect(container.querySelector('template')).toBeNull()
		expect(container.querySelector('p')!.textContent).toBe('X')
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
