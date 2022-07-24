import { encode, decode } from '@ygoe/msgpack'

export type WSResponse = {
	data: string | ArrayBuffer
}

export type WSAPI = {
	[x: string]: (...args: any) => Promise<any[]>
} & {
	open(): Promise<any>
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
			let path = location.pathname.substring(1),
				i = path.indexOf('/')
			ws = new WebSocket(`ws://${location.host}/wsapi?path=${i < 0 ? path : path.substring(0, i)}`)
			ws.binaryType = 'arraybuffer'
			ws.addEventListener('message', (e: WSResponse) => {
				if (typeof e.data == 'string')
					throw new Error(e.data)
				let r: any[] = decode(e.data, { multiple: true }),
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
	initWSAPI = (funcs: string[]) => {
		for (let func of funcs)
			wsAPI[func] = async (...args) => {
				let rid = id++, arr = [rid, func, ...args]
				await wsAPI.open()
				ws.send(encode(arr, { multiple: true }))
				return new Promise((res, rej) => {
					callbacks[rid] = res
					setTimeout(() => {
						if (rid in callbacks) {
							delete callbacks[rid]
							rej(timeoutError)
						}
					}, func == 'post' ? 20 * 1000 : 10 * 1000)
				})
			}
	}
