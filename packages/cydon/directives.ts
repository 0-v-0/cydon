import { directives } from "./cydon"

directives.push(function ({ name, value, ownerElement: n }) {
	if (name == 'c-model' || name == 'c-model.lazy') {
		n!.addEventListener(name == 'c-model' ? 'input' : 'change', e => {
			const newVal = (<HTMLInputElement>e.target).value
			if (this.data[value] != newVal)
				this.data[value] = newVal
		})
		return true
	}
	if (name[0] == '@') {
		n!.addEventListener(name.slice(1), this.getFunc(value))
		return true
	}
	return
})
