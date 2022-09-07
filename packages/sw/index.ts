/// <reference lib="webworker" />

declare var self: ServiceWorkerGlobalScope

import { decode, encode } from '@ygoe/msgpack'

export type WSResponse = {
	data: string | ArrayBuffer
}

let ws: WebSocket | undefined,
	id = 0

// 键：client字符串id，值：client数字id
const map = new Map<string, number>(),
	queue: string[] = []

// 创建或返回已存在的ws连接
const connect = async (): Promise<Event | void> => {
	if (!ws || ws.readyState == WebSocket.CLOSED) {
		const path = location.pathname.substring(1),
			i = path.indexOf('/')
		ws = new WebSocket(`ws://${location.host}/wsapi?path=${i < 0 ? path : path.substring(0, i)}`)
		ws.binaryType = 'arraybuffer'
		ws.addEventListener('message', (e: WSResponse) => {
			if (typeof e.data == 'string')
				throw new Error(e.data)
			const r: any[] = decode(e.data, { multiple: true })
			let id = r[0]
			if (id > 0) {
				id >>>= 24 // 取高8位client id
				if (id in queue) {
					r[0] &= 0xffffff // 取请求id
					self.clients.get(queue[id]).then(client => {
						if (client)
							client.postMessage(r)
						else
							delete queue[id]
					})
				}
			} else { // 更新数据
				console.assert(id)
				self.clients.matchAll({ type: 'window' }).then(clients => {
					for (const client of clients)
						client.postMessage({ process: id })
				})
			}
		})
		return new Promise(res => ws!.addEventListener('open', res))
	}
}

self.addEventListener('message', e => {
	if (e.data == 'close') {// 关闭连接
		ws?.close()
		ws = void 0
	} else {
		const cid = (<Client | null>e.source)?.id
		if (cid) {
			console.assert(typeof e.data[0] == 'number')
			console.log(e.data[1])
			let rid = map.get(cid)!
			if (rid == void 0)
				map.set(cid, rid = id++)
			e.data[0] |= rid << 24 // 合成请求id
			e.waitUntil(connect().then(() => {
				ws!.send(encode(e.data, { multiple: true }))
				queue[rid] = cid
			}))
		}
	}
})

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))