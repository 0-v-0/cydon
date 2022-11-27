import { Constructor as Ctor } from '.'

export type EventType = string | number | symbol
export type Handler = (...args: any[]) => void
export type EventHandlerList = Handler[]
export type EventHandlerMap = Record<EventType, EventHandlerList>

export const EventOf = <T extends {}, Events extends Record<EventType, unknown>>(
	base: Ctor<T> = <any>Object,
	events: EventHandlerMap = {}
) => {
	class Mixin extends (<Ctor<Object>>base) {
		events = events

		/**
		 *  On: listen to events
		 */
		on<Key extends keyof Events>(type: Key, func: Handler) {
			(events[type] = events[type] || []).push(func)
			return this
		}

		/**
		 *  Off: stop listening to event / specific callback
		 */
		off<Key extends keyof Events>(type: Key, func?: Handler) {
			type || (events = {})
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
		emit<Key extends keyof Events>(type: Key, ...args: any[]) {
			const list = events[type]
			if (list)
				for (let e of list)
					e.apply(this, args)
			return this
		}
	}
	return <Ctor<T & Mixin>>Mixin
}