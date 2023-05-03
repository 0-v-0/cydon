import { assert, expect } from '@esm-bundle/chai'
import { ImportHTML, delay } from '../packages/ui'

const beforeAll = setup, afterAll = teardown, it = test

const headers = {
	'Content-Type': 'text/html; charset=utf-8'
}
const responses: Record<string, (req: Request) => Response | Promise<Response>> = {
	'/hello': () => new Response('<div id="replaced">hello</div>', {
		status: 200,
		headers
	}),
	'/slow-hello': () => delay<Request>(100).then(responses['/hello']),
	'/one-two': () => new Response('<p id="one">one</p><p id="two">two</p>', {
		status: 200,
		headers
	}),
	'/boom': () => new Response('boom', {
		status: 500
	}),
	'/fragment'(req) {
		if (req.headers.get('Accept') == 'text/fragment+html')
			return new Response('<div id="fragment">fragment</div>', {
				status: 200,
				headers: {
					'Content-Type': 'text/fragment+html'
				}
			})
		return new Response('406', {
			status: 406
		})
	}
}

const query = <K extends keyof HTMLElementTagNameMap>(s: K) => document.querySelector<K>(s)!
const byId = (s: string) => document.getElementById(s)!

const when = (el: Node, type: string) =>
	new Promise<Event>(res => el.addEventListener(type, res))

const lazyTest = (el: HTMLElement) =>
	Promise.race([
		when(el.firstChild!, 'load').then(() => {
			throw new Error('<import-html lazy> loaded too early')
		}),
		delay(100)
	])

function hiddenDiv() {
	const div = document.createElement('div')
	div.hidden = true
	return div
}

suite('import-html-element', () => {
	const originalFetch = window.fetch
	beforeAll(() => {
		window.fetch = (input, init) => {
			const req = new Request(input, init)
			return Promise.resolve(responses[new URL(req.url).pathname](req))
		}
	})
	afterAll(() => {
		window.fetch = originalFetch
		document.body.innerHTML = ''
	})

	it('create from document.createElement & constructor', () => {
		const el = document.createElement('import-html')
		expect(el.nodeName).eq('IMPORT-HTML')
		const el2 = new ImportHTML
		expect(el2.nodeName).eq('IMPORT-HTML')
	})

	it('src property', () => {
		const el = new ImportHTML
		expect(el.getAttribute('src')).eq(null)
		expect(el.src).eq('')

		el.src = '/hello'
		expect(el.getAttribute('src')).eq('/hello')
		expect(el.src).eq(new URL('/hello', document.baseURI).href)
	})

	it('manually call load', () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/hello"></import-html>'

		return (<ImportHTML>div.firstChild).load().then(
			() => expect(div.innerHTML).eq('<div id="replaced">hello</div>'),
			() => assert(false)
		)
	})

	it('throws on 406', () => {
		const el = new ImportHTML
		el.setAttribute('src', '/fragment')

		return el.load().then(
			() => assert(false),
			err => expect(err).match(/the server responded with a status of 406/)
		)
	})

	it('replaces element on 200 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/hello">loading</import-html>'
		document.body.appendChild(div)
		await when(div.firstChild!, 'load')

		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hello')
	})

	it('does not replace element if it has no parent', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html>loading</import-html>'
		const fail = () => assert(false)
		addEventListener('unhandledrejection', fail)

		const el = <ImportHTML>div.firstChild
		el.remove()
		document.body.appendChild(div)
		el.src = '/hello'

		let load: boolean

		el.addEventListener('loadstart', () => load = true)

		setTimeout(() => {
			assert(!load)
			div.appendChild(el)
		}, 10)

		await when(el, 'load')
		expect(byId('replaced').textContent).eq('hello')
		removeEventListener('unhandledrejection', fail)
	})

	it('replaces with several new elements on 200 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/one-two">loading</import-html>'
		document.body.appendChild(div)
		await when(div.firstChild!, 'load')

		expect(query('import-html')).eq(null)
		expect(byId('one').textContent).eq('one')
		expect(byId('two').textContent).eq('two')
	})

	it('error event is not cancelable or bubbles', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/boom">loading</import-html>'
		document.body.appendChild(div)

		const event = await when(div.firstChild!, 'error')
		assert(!event.bubbles)
		assert(!event.cancelable)
	})

	it('sets status to "error" on 500 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/boom">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'error')
		return expect(query('import-html')?.status).eq('error')
	})

	it('fires replaced event', async () => {
		const el = new ImportHTML
		el.src = '/hello'
		document.body.appendChild(el)

		await when(el, 'frag-replaced')
		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hello')
	})

	it('fires events for import-html node replacement operations for fragment manipulation', async () => {
		const el = new ImportHTML
		el.src = '/hello'
		document.body.appendChild(el).addEventListener('frag-replace',
			e => e.detail.querySelector('*')!.textContent = 'hey')

		await when(el, 'frag-replaced')
		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hey')
	})

	it('does not replace node if event was canceled', async () => {
		const el = new ImportHTML
		el.src = '/hello'
		document.body.appendChild(el).addEventListener('frag-replace', e => e.preventDefault())

		await when(el, 'load')
		assert(query('import-html'), 'Node should not be replaced')
	})

	suite('event order', () => {
		const originalSetTimeout = setTimeout
		beforeAll(() => {
			// Emulate some kind of timer clamping
			let i = 60
			window.setTimeout = <any>((fn: (...args: any[]) => void, ms: number, ...rest: any[]) =>
				originalSetTimeout(fn, ms + (i -= 20), ...rest))
		})
		afterAll(() => {
			window.setTimeout = originalSetTimeout
		})

		it('loading events fire in guaranteed order', async () => {
			const el = new ImportHTML
			const order: string[] = []
			const connected: boolean[] = []
			const events = [
				when(el, 'loadend').then(() => {
					order.push('loadend')
					connected.push(el.isConnected)
				}),
				when(el, 'load').then(() => {
					order.push('load')
					connected.push(el.isConnected)
				}),
				when(el, 'loadstart').then(() => {
					order.push('loadstart')
					connected.push(el.isConnected)
				})
			]
			el.src = '/hello'
			document.body.appendChild(el)

			await Promise.all(events)
			expect(order).deep.eq(['loadstart', 'load', 'loadend'])
			expect(connected).deep.eq([true, false, false])
		})
	})

	it('sets status to "pending" while loading', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/slow-hello">loading</import-html>'
		document.body.appendChild(div)

		const el = <ImportHTML>div.firstChild
		when(el, 'loadstart').then(() => expect(el.status).eq('pending'))
		await when(el, 'frag-replaced')
	})

	it('lazy loads if already visible on page', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)
		await when(div.firstChild!, 'frag-replaced')
		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hello')
	})

	it('lazy does not load if not visible on page', () => {
		const div = hiddenDiv()
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)
		return lazyTest(div)
	})

	it('lazy does not load when src is changed', () => {
		const div = hiddenDiv()
		div.innerHTML = '<import-html lazy src="">loading</import-html>';
		(<ImportHTML>document.body.appendChild(div).firstChild).src = '/hello'
		return lazyTest(div)
	})

	it('lazy loads as soon as element visible on page', async () => {
		const div = hiddenDiv()
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)
		const handler = () => assert(false, 'Load occured too early')
		div.firstChild!.addEventListener('load', handler)

		setTimeout(() => {
			div.hidden = false
			div.firstChild!.removeEventListener('load', handler)
		}, 100)

		await when(div.firstChild!, 'load')
	})

	it('lazy does not observably change during load cycle', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		const el = <ImportHTML>div.firstChild
		document.body.appendChild(div)

		await when(el, 'loadstart')
		expect(el.lazy).eq(true)
	})

	it('lazy can be switched to eager to load', async () => {
		const div = hiddenDiv()
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)
		const handler = () => assert(false, 'Load occured too early')
		const el = <ImportHTML>div.firstChild
		el.addEventListener('load', handler)

		setTimeout(() => {
			(<ImportHTML>div.firstChild).lazy = false
			el.removeEventListener('load', handler)
		}, 100)

		await when(el, 'load')
	})

	it('lazy wont load twice even if load is manually called', async () => {
		const div = hiddenDiv()
		div.innerHTML = '<import-html lazy src="/slow-hello">loading</import-html>'
		document.body.appendChild(div)
		let loadCount = 0
		const el = <ImportHTML>div.firstChild
		el.addEventListener('loadstart', () => loadCount++)
		setTimeout(() => div.hidden = false)

		el.load()
		await when(el, 'frag-replaced')
		expect(loadCount).eq(1, 'Load occured too many times')
		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hello')
	})

	it('frag-replaced is only called once', async () => {
		const div = document.body.appendChild(hiddenDiv())

		div.innerHTML = `<import-html src="/hello">loading</import-html>`
		div.firstChild!.addEventListener('frag-replaced', () => loadCount++)

		let loadCount = 0
		setTimeout(() => div.hidden = false)

		await when(div.firstChild!, 'frag-replaced')
		expect(loadCount).eq(1, 'Load occured too many times')
		expect(query('import-html')).eq(null)
		expect(byId('replaced').textContent).eq('hello')
	})
})
