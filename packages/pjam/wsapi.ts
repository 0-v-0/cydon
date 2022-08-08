import { encode, decode } from '@ygoe/msgpack'

export type WSResponse = {
	data: string | ArrayBuffer
}

export type WSAPI = {
	[x: string]: (...args: any) => Promise<any[]>
} & {
	open(): Promise<Event | void>
	readonly state: number
	close(): void
	process?(data: any): void
}

type Callback = (value: any[]) => void

let ws: WebSocket,
	id = 1,
	callbacks: Callback[] = []

export const timeoutError = new Error('Request timeout'),
	wsAPI = <WSAPI>{
		async open() {
			if (wsAPI.state != WebSocket.CLOSED)
				return
			const path = location.pathname.substring(1),
				i = path.indexOf('/')
			ws = new WebSocket(`ws://${location.host}/wsapi?path=${i < 0 ? path : path.substring(0, i)}`)
			ws.binaryType = 'arraybuffer'
			ws.addEventListener('message', (e: WSResponse) => {
				if (typeof e.data == 'string')
					throw new Error(e.data)
				const r: any[] = decode(e.data, { multiple: true }),
					id = r[0]
				if (id > 0) {
					if (id in callbacks) {
						callbacks[id](r.slice(1))
						delete callbacks[id]
					}
				} else { // 更新数据
					console.assert(id)
					this.process?.(id)
				}
			})
			return new Promise(res => ws.addEventListener('open', res))
		},
		get state() { return ws ? ws.readyState : WebSocket.CLOSED },
		close() { ws.close() }
	},
	initWSAPI = (funcs: string[], timeout = (_func: string) => 10 * 1000) => {
		for (const func of funcs)
			wsAPI[func] = (...args) => {
				const rid = id++, arr = [rid, func, ...args]
				wsAPI.open().then(() => ws.send(encode(arr, { multiple: true })))
				return new Promise((res, rej) => {
					callbacks[rid] = res
					setTimeout(() => {
						if (rid in callbacks) {
							delete callbacks[rid]
							rej(timeoutError)
						}
					}, timeout(func))
				})
			}
	}
