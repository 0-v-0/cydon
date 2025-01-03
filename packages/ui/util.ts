export const delay = <T = void>(ms?: number) => new Promise<T>(resolve => setTimeout(resolve, ms))

export const isDisabled = (el: Element) => !el || el.nodeType != 1 || (<any>el).disabled

	/**
	* Trick to restart an element's animation
	*
	* @see https://www.charistheo.io/blog/2021/02/restart-a-css-animation-with-javascript/#restarting-a-css-animation
	*/
	,
	reflow = (element: HTMLElement) => element.offsetHeight,

	onDOMContentLoaded = (callback: (ev?: Event) => void) => {
		if (document.readyState == 'loading')
			addEventListener('DOMContentLoaded', callback)
		else
			callback()
	}
