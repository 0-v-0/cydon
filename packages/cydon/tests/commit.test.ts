import { describe, expect, test, vi } from 'vitest'
import { Cydon } from '../index'
import { tick } from './setup'

describe('commit side-effect guard', () => {
	// `${++count}` writes `count` through the deps-tracking proxy while
	// its target is being evaluated. That write lands raw on $data without
	// entering the queue, so it must never cascade into further commits, and
	// development builds must report it.
	test('a binding write during commit is warned once and never cascades', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<p>${++count}</p>'
		const app = new Cydon({ count: 1 })
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		// bind evaluates outside a commit: the side-effecting write is applied
		// but not queued, so no commit is scheduled
		app.mount(container)
		expect(container.querySelector('p')!.textContent).toBe('2')
		expect(app.data.count).toBe(2)
		expect((app as any).$queue.size).toBe(0)
		expect(warn).not.toHaveBeenCalled()

		// an external write schedules the commit; re-evaluating the
		// side-effecting binding during it warns exactly once
		app.data.count = 10
		await tick()
		const p = container.querySelector('p')!
		expect(p.textContent).toBe('11')
		expect(app.data.count).toBe(11)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('during a commit'))

		// the unqueued write must not schedule further commits
		await tick()
		expect(p.textContent).toBe('11')
		expect(app.data.count).toBe(11)
		warn.mockRestore()
	})

	// A failed evaluation must not invalidate its target: the deps recorded
	// before the throw persist, so fixing the data re-renders the binding.
	test('a binding whose evaluation throws recovers when its data becomes valid', async () => {
		const container = document.createElement('div')
		container.innerHTML = '<p>${a.b}</p><p>$ok</p>'
		const app = new Cydon({ a: { b: 'B' }, ok: 'fine' })
		app.mount(container)
		const ps = container.querySelectorAll('p')
		expect(ps[0].textContent).toBe('B')

		// make the first binding's evaluation throw mid-commit; the manual
		// commit surfaces the error synchronously and clears the queue, so the
		// scheduled microtask finds nothing to update and does not re-throw
		app.data.a = <any>undefined
		expect(() => app.commit()).toThrow()
		await tick()
		expect(ps[0].textContent).toBe('B')

		// deps recorded before the throw still match the queue: fixing the
		// data re-renders the binding
		app.data.a = { b: 'B2' }
		await tick()
		expect(ps[0].textContent).toBe('B2')

		// and commits keep working for other bindings
		app.data.ok = 'fine2'
		await tick()
		expect(ps[1].textContent).toBe('fine2')
	})
})
