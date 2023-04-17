import { AsyncLoad, Status } from './AsyncLoad'
import { toFunction } from 'cydon'

/**
 * 异步加载器组件
 * 属性
 * output：在slot=loaded的元素上有效，用于存放结果属性名，若属性名为空则将结果存至该元素的textContent
 */
export class CAsync extends AsyncLoad {
	override createFunc(code: string) {
		const setValue = (status: Status, val: any) => {
			for (const el of this.querySelectorAll(`[slot=${status}][output]`)) {
				const output = el.getAttribute('output')
				if (output)
					el.setAttribute(output, val)
				else
					el.textContent = val
			}
		}
		return async () => {
			// find the nearest cydon object
			let node = this.parentNode
			for (; node; node = node.parentNode)
				if ('$data' in node && '$directives' in node)
					break
			try {
				setValue('loaded', await toFunction('return ' + code).call(node ?? this, this))
			} catch (e) {
				setValue('error', e)
				throw e
			}
		}
	}
}
customElements.define('c-async', CAsync)

declare global {
	interface HTMLElementTagNameMap {
		'c-async': CAsync
	}
}