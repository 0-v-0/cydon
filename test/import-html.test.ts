import { assert } from '@open-wc/testing'
import { ImportHTML } from '../packages/ui'
const beforeAll = setup, afterAll = teardown, it = test

let count: number
const responses: Record<string, (req: Request) => Response | Promise<Response>> = {
	'/hello': () => new Response('<div id="replaced">hello</div>', {
		status: 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8'
		}
	}),
	'/slow-hello': () => new Promise<Request>(resolve => {
		setTimeout(resolve, 100)
	}).then(responses['/hello']),
	'/one-two': () => new Response('<p id="one">one</p><p id="two">two</p>', {
		status: 200,
		headers: {
			'Content-Type': 'text/html'
		}
	}),
	'/blank-type': () => new Response('<div id="replaced">hello</div>', {
		status: 200,
		headers: {
			'Content-Type': ''
		}
	}),
	'/boom': () => new Response('boom', {
		status: 500
	}),
	'/count': () => {
		count++
		return new Response(`${count}`, {
			status: 200,
			headers: {
				'Content-Type': 'text/html'
			}
		})
	},
	'/fragment': (request) => {
		if (request.headers.get('Accept') == 'text/fragment+html') {
			return new Response('<div id="fragment">fragment</div>', {
				status: 200,
				headers: {
					'Content-Type': 'text/fragment+html'
				}
			})
		} else {
			return new Response('406', {
				status: 406
			})
		}
	},
	'/test.js': () => new Response('alert("what")', {
		status: 200,
		headers: {
			'Content-Type': 'text/javascript'
		}
	})
}

const query = (s: string) => document.querySelector(s)!

function when(el: Node, type: string) {
	return new Promise<Event>(res => el.addEventListener(type, res))
}

beforeAll(() => {
	count = 0
	ImportHTML.prototype.request = function () {
		const url = new URL(this.src, location.origin)
		return Promise.resolve(responses[url.pathname](new Request(url)))
	}
})

suite('import-html-element', () => {
	beforeAll(() => { document.body.innerHTML = '34235' })
	afterAll(() => {
		document.body.innerHTML = ''
	})

	it('create from document.createElement', () => {
		const el = document.createElement('import-html')
		assert.equal('IMPORT-HTML', el.nodeName)
	})

	it('create from constructor', () => {
		const el = new ImportHTML
		assert.equal('IMPORT-HTML', el.nodeName)
	})

	it('src property', () => {
		const el = document.createElement('import-html')
		assert.equal(null, el.getAttribute('src'))
		assert.equal('', el.src)

		el.src = '/hello'
		assert.equal('/hello', el.getAttribute('src'))
		assert.equal(new URL('/hello', document.baseURI).href, el.src)
	})

	it('data with src property', () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/hello"></import-html>'

		return (<ImportHTML>div.firstChild).load().then(
			() => assert.equal('<div id="replaced">hello</div>', div.innerHTML),
			() => assert.ok(false)
		)
	})

	it('throws on 406', () => {
		const el = document.createElement('import-html')
		el.setAttribute('src', '/fragment')

		return el.load().then(
			() => assert.ok(false),
			err => assert.match(err, /the server responded with a status of 406/)
		)
	})

	it('replaces element on 200 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/hello">loading</import-html>'
		await when(div.firstChild!, 'load')
		document.body.appendChild(div)

		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('does not replace element if it has no parent', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html>loading</import-html>'
		document.body.appendChild(div)

		const fragment = <ImportHTML>div.firstChild
		fragment.remove()
		fragment.src = '/hello'

		let didRun: boolean

		addEventListener('unhandledrejection', () => assert.ok(false))

		fragment.addEventListener('loadstart', () => didRun = true)

		setTimeout(() => {
			assert.ok(!didRun)
			div.appendChild(fragment)
		}, 10)

		await when(fragment, 'load')
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('replaces with several new elements on 200 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/one-two">loading</import-html>'
		await when(div.firstChild!, 'load')
		document.body.appendChild(div)

		assert.equal(query('import-html'), null)
		assert.equal(query('#one').textContent, 'one')
		assert.equal(query('#two').textContent, 'two')
	})

	it('replaces with response with accept header for any', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/test.js" accept="*/*">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'load')
		assert.equal(query('import-html'), null)
		assert.match(document.body.textContent!, /alert\("what"\)/)
	})

	it('replaces with response with the right accept header', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/fragment" accept="text/fragment+html">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'load')
		assert.equal(query('import-html'), null)
		assert.equal(query('#fragment').textContent, 'fragment')
	})

	it('error event is not cancelable or bubbles', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/boom">loading</import-html>'
		document.body.appendChild(div)

		const event = await when(div.firstChild!, 'error')
		assert.equal(event.bubbles, false)
		assert.equal(event.cancelable, false)
	})

	it('adds is-error class on 500 status', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/boom">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'error')
		return assert.ok(query('import-html').classList.contains('is-error'))
	})

	it('adds is-error class on mising Content-Type', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/blank-type">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'error')
		return assert.ok(query('import-html').classList.contains('is-error'))
	})

	it('adds is-error class on incorrect Content-Type', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html src="/fragment">loading</import-html>'
		document.body.appendChild(div)

		await when(div.firstChild!, 'error')
		return assert.ok(query('import-html').classList.contains('is-error'))
	})

	it('replaces element when src attribute is changed', async () => {
		const el = document.createElement('import-html')
		document.body.appendChild(el)

		setTimeout(() => el.src = '/hello', 10)

		await when(el, 'load')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('fires replaced event', async () => {
		const el = document.createElement('import-html')
		document.body.appendChild(el)

		setTimeout(() => el.src = '/hello', 10)

		await when(el, 'import-html-replaced')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('fires events for import-html node replacement operations for fragment manipulation', async () => {
		const el = document.createElement('import-html')
		document.body.appendChild(el)

		setTimeout(() => el.src = '/hello', 10)

		el.addEventListener('frag-replace', e => e.detail.querySelector('*')!.textContent = 'hey'
		)

		await when(el, 'frag-replaced')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hey')
	})

	it('does not replace node if event was canceled ', async () => {
		const el = document.createElement('import-html')
		document.body.appendChild(el)

		setTimeout(() => el.src = '/hello', 10)

		el.addEventListener('import-html-replace', e => e.preventDefault())

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
			const el = document.createElement('import-html')
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
			assert.deepStrictEqual(order, ['loadstart', 'load', 'loadend'])
			assert.deepStrictEqual(connected, [true, false, false])
		})
	})

	it('sets loading to "eager" by default', () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)

		assert((<ImportHTML>div.firstChild).loading, 'eager')
	})

	it('loading=lazy loads if already visible on page', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		document.body.appendChild(div)
		await when(div.firstChild!, 'import-html-replaced')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('loading=lazy does not load if not visible on page', () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		div.hidden = true
		document.body.appendChild(div)
		return Promise.race([
			when(div.firstChild!, 'load').then(() => {
				throw new Error('<import-html lazy> loaded too early')
			}),
			new Promise(resolve => setTimeout(resolve, 100))
		])
	})

	it('loading=lazy does not load when src is changed', () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="">loading</import-html>'
		div.hidden = true;
		(<ImportHTML>document.body.appendChild(div)
			.firstChild).src = '/hello'
		return Promise.race([
			when(div.firstChild!, 'load').then(() => {
				throw new Error('<import-html loading=lazy> loaded too early')
			}),
			new Promise(resolve => setTimeout(resolve, 100))
		])
	})

	it('loading=lazy loads as soon as element visible on page', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		div.hidden = true
		let failed = false
		document.body.appendChild(div)
		const fail = () => (failed = true)
		div.firstChild!.addEventListener('load', fail)

		setTimeout(() => {
			div.hidden = false
			div.firstChild!.removeEventListener('load', fail)
		}, 100)

		await when(div.firstChild!, 'load')
		assert.ok(!failed, 'Load occured too early')
	})

	it('loading=lazy does not observably change during load cycle', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		const el = <ImportHTML>div.firstChild
		document.body.appendChild(div)

		await when(el, 'loadstart')
		assert.equal(el.lazy, true, 'loading mode changed observably')
	})

	it('loading=lazy can be switched to eager to load', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/hello">loading</import-html>'
		div.hidden = true
		let failed = false
		document.body.appendChild(div)
		const fail = () => (failed = true)
		div.firstChild!.addEventListener('load', fail)

		setTimeout(() => {
			(<ImportHTML>div.firstChild).lazy = false
			div.firstChild!.removeEventListener('load', fail)
		}, 100)

		await when(div.firstChild!, 'load')
		return assert.ok(!failed, 'Load occured too early')
	})

	it('loading=lazy wont load twice even if load is manually called', async () => {
		const div = document.createElement('div')
		div.innerHTML = '<import-html lazy src="/slow-hello">loading</import-html>'
		div.hidden = true
		document.body.appendChild(div)
		let loadCount = 0
		div.firstChild!.addEventListener('loadstart', () => loadCount++)
		const load = (<ImportHTML>div.firstChild).load()
		setTimeout(() => div.hidden = false)

		await load
		await when(div.firstChild!, 'import-html-replaced')
		assert.equal(loadCount, 1, 'Load occured too many times')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})

	it('import-html-replaced is only called once', async () => {
		const div = document.createElement('div')
		div.hidden = true
		document.body.append(div)

		div.innerHTML = `<import-html src="/hello">loading</import-html>`
		div.firstChild!.addEventListener('import-html-replaced', () => loadCount++)

		let loadCount = 0
		setTimeout(() => {
			div.hidden = false
		}, 0)

		await when(div.firstChild!, 'import-html-replaced')
		assert.equal(loadCount, 1, 'Load occured too many times')
		assert.equal(query('import-html'), null)
		assert.equal(query('#replaced').textContent, 'hello')
	})
})