// jsdom lacks requestIdleCallback, which cydon uses to clean up removed bindings.
if (typeof globalThis.requestIdleCallback !== 'function') {
	;(globalThis as any).requestIdleCallback = (cb: () => void) => setTimeout(cb, 0)
	;(globalThis as any).cancelIdleCallback = (id: number) => clearTimeout(id)
}

/** Wait for cydon's microtask commit queue to flush. */
export const tick = () => new Promise<void>((r) => setTimeout(r, 0))
