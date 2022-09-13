export type WSAPI = {
	[x: string]: (...args: any) => Promise<any[]>
} & {
	close(): void
	process?(data: any): void
}

type Callback = (value: any[]) => void

const sw = navigator.serviceWorker
sw.register('/sw.js') // TODO
sw.addEventListener('message', e => {
	if (e.data.process)
		wsAPI.process?.(e.data.process)
	else {
		const id = e.data[0]
		console.log(e.data)
		callbacks[id]?.(e.data.slice(1))
		delete callbacks[id]
	}
})

let id = 1,
	callbacks: Callback[] = []

export const timeoutError = new Error('Request timeout'),
	wsAPI = <WSAPI>{
		close() { sw.controller!.postMessage('close') }
	},
	// 初始化WSAPI
	initWSAPI = (funcs: string[], timeout = (_func: string) => 10 * 1000) => {
		for (const func of funcs) {
			wsAPI[func] = (...args) => {
				const rid = id++
				sw.ready.then(r => r.active!.postMessage([rid, func, ...args]))
				return new Promise((res, rej) => {
					callbacks[rid] = res
					setTimeout(() => {
						if (rid in callbacks) {
							delete callbacks[rid]
							rej(timeoutError) // 超时
						}
					}, timeout(func))
				})
			}
		}
	}

addEventListener('unload', () => wsAPI.close()) // TODO: Remove this hack