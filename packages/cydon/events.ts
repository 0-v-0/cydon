import { Constructor as Ctor } from '.'

export type EventType = string | number | symbol
export type Handler = (...args: any[]) => void
export type EventHandlerList = Handler[]
export type EventHandlerMap = {
	[x: EventType]: EventHandlerList
}

export interface Emitter<Events extends Record<EventType, unknown>> {
	events: EventHandlerMap | null

	on<Key extends keyof Events>(type: Key, handler: Handler): Emitter<Events>
	off<Key extends keyof Events>(type: Key, handler?: Handler): Emitter<Events>

	emit<Key extends keyof Events>(type: Key, ...args: any[]): Emitter<Events>
}

export default function Events<T, Events extends Record<EventType, unknown>>(
	target: T,
	events: EventHandlerMap = {}
) {
	const obj = <T & Emitter<Events>>target
	obj.events = events
	/**
	 *  On: listen to events
	 */
	obj.on = <Key extends keyof Events>(type: Key, func: Handler) => {
		(events[type] = events[type] || []).push(func)
		return obj
	}
	/**
	 *  Off: stop listening to event / specific callback
	 */
	obj.off = <Key extends keyof Events>(type: Key, func?: Handler) => {
		type || (events = {})
		if (func) {
			const list = events[type]
			list?.splice(list.indexOf(func) >>> 0, 1)
		} else
			delete events[type]
		return obj
	}
	/**
	 * Emit: send event, callbacks will be triggered
	 */
	obj.emit = (type: EventType, ...args: any[]) => {
		const list = events[type]
		if (list)
			for (let e of list)
				e.apply(target, args)
		return obj
	}
	return obj
}

export const EventOf = <T extends Object, Events extends Record<EventType, unknown>>(base: Ctor<T>) =>
	<Ctor<T & Emitter<Events>>>class extends (<Ctor<Object>>base) {
		constructor(...args: any[]) {
			super(...args)
			Events(this)
		}
	}