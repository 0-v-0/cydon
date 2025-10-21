import { boundElements, context } from './event'
import { Data, Directive, DirectiveHandler } from '../type'
import { toFunction } from '../util'

type D = Directive | void
type Input = HTMLInputElement

/** elements that are composing */
export const composing = new WeakSet<EventTarget>

export default <DirectiveHandler>((name, value, el, attrs): D => {
	if (name == 'c-model' || name == 'c-model.lazy') {
		value = value.trim()
		attrs.set(Symbol(), {
			f(el) {
				el[context] = this
			}
		})

		const isSelect = el.tagName == 'SELECT'
		const event = name != 'c-model' || isSelect ||
			(<Input>el).type == 'radio' || (<Input>el).type == 'checkbox' ? 'change' : 'input'

		if (import.meta.env.DEV && isSelect) {
			console.warn('redundant c-model.lazy on select element', el)
		}

		let set = boundElements.get(event)
		if (!set)
			boundElements.set(event, set = new WeakSet)
		return {
			deps: new Set,
			f(el) {
				const getter = value in this ?
					function (this: Data, el: Element) { return this[value] } :
					toFunction('return ' + value)
				const setter = value in this ? function (this: Data, el: Element, val: any) {
					this[value] = val
				} : Function('$e,$val', `with(this)${value}=$val`)
				if (!set!.has(el)) {
					if (event == 'input') {
						el.addEventListener('compositionstart',
							e => composing.add(e.target!))
						el.addEventListener('compositionend',
							e => composing.delete(e.target!))
					}
					el.addEventListener(event, () => {
						if (!composing.has(el)) {
							const newVal = isSelect && (<HTMLSelectElement>el).multiple ?
								[...(<HTMLSelectElement>el).selectedOptions].map(
									option => option.value || option.text) :
								(<Input>el).type == 'checkbox' ?
									(<Input>el).checked :
									(<Input>el).value
							setter.call(el[context], el,
								typeof getter.call(this, el) == 'number' ? +newVal : newVal)
						}
					})
					set!.add(el)
				}
				// Two-way binding
				const val = getter.call(this, el)
				if ((<Input>el).type == 'radio')
					(<Input>el).checked = val == (<Input>el).value
				else if ((<Input>el).type == 'checkbox')
					(<Input>el).checked = val
				else if (isSelect) {
					if ((<HTMLSelectElement>el).multiple)
						for (const option of (<HTMLSelectElement>el).options)
							option.selected = val.includes(option.value || option.text)
					else
						queueMicrotask(() => (<Input>el).value = val)
				} else
					(<Input>el).value = val
			}
		}
	}
})