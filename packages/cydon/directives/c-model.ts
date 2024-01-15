import { boundElements, context } from './event'
import { Directive, DirectiveHandler } from '../type'
import { toFunction } from '../util'

type D = Directive | void
type Input = HTMLInputElement

export const composing = new WeakSet<EventTarget>

export default <DirectiveHandler>((name, value, el, attrs): D => {
	if (name == 'c-model' || name == 'c-model.lazy') {
		value = value.trim()
		attrs.set(Symbol(), {
			f(el) {
				el[context] = this
			}
		})

		const isCheckbox = (<Input>el).type == 'checkbox'
		const isRadio = (<Input>el).type == 'radio'
		const isSelect = el.tagName == 'SELECT'
		const event = name != 'c-model' || isSelect || isRadio || isCheckbox ? 'change' : 'input'

		let set = boundElements.get(event)
		if (!set)
			boundElements.set(event, set = new WeakSet)
		const getter = toFunction('return ' + value)
		const setter = Function('$e,$val', `with(this)${value}=$val`)
		return {
			deps: new Set,
			f(el) {
				if (!set!.has(el)) {
					if (event == 'input') {
						el.addEventListener('compositionstart',
							e => composing.add(e.target!))
						el.addEventListener('compositionend',
							e => composing.delete(e.target!))
					}
					el.addEventListener(event, () => {
						if (!composing.has(el)) {
							setter.call(el[context], el,
								isSelect && (<HTMLSelectElement>el).multiple ?
									[...(<HTMLSelectElement>el).selectedOptions].map(
										option => option.value || option.text) :
									isCheckbox ?
										(<Input>el).checked :
										(<Input>el).value)
						}
					})
					set!.add(el)
				}
				// Two-way binding
				const val = getter.call(this, el)
				if (isRadio)
					(<Input>el).checked = val == (<Input>el).value
				else if (isCheckbox)
					(<Input>el).checked = val
				else if (isSelect && (<HTMLSelectElement>el).multiple)
					for (const option of (<HTMLSelectElement>el).options)
						option.selected = val.includes(option.value || option.text)
				else
					(<Input>el).value = val
			}
		}
	}
})