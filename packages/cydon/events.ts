import { Constructor as Ctor } from './type'

export type EventType = keyof any
export type Handler<T extends any[] = any[]> = (...args: T) => void
export type EventHandlerMap<Events extends EventMap> = { [K in keyof Events]: Handler<Events[K]>[] }
export type EventMap = Record<EventType, any[]>

export const EventOf = <T extends {}, Events extends EventMap>(
	base: Ctor<T> = <any>Object,
	events: EventHandlerMap<Events> = <typeof events>{}
) => {
	type Handler<A extends any[]> = (this: T & Mixin, ...args: A) => void
	class Mixin extends (<Ctor<Object>>base) {
		events = events

		/**
		 *  On: listen to events
		 */
		on<K extends keyof Events>(type: K, func: Handler<Events[K]>) {
			(events[type] = events[type] || []).push(func)
			return this
		}

		/**
		 *  Off: stop listening to event / specific callback
		 */
		off<K extends keyof Events>(type: K, func?: Handler<Events[K]>) {
			type || (events = <typeof events>{})
			if (func) {
				const list = events[type]
				list?.splice(list.indexOf(func) >>> 0, 1)
			} else
				delete events[type]
			return this
		}

		/**
		 * Emit: send event, callbacks will be triggered
		 */
		emit<K extends keyof Events>(type: K, ...args: Events[K]) {
			const list = events[type]
			if (list)
				for (const e of list)
					e.apply(this, args)
			return this
		}
	}
	return <Ctor<T & Mixin>>Mixin
}