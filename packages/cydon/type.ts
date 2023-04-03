export type Data = Record<string, any>

export type Constructor<T> = new (...args: any[]) => T

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Part = {
	deps?: Dep
	func(this: Data, el: Element): string
}

export type Target = {
	node: Text | Element
	deps: Dep
	data: Data
	func: Part['func']
	text?: boolean
}

export type Dep = Set<string>

type AttrMap = Map<string, Part>

/** template result */
export type Result = Partial<Part> & {
	a?: AttrMap // attributes
	r?: Result[]
	s?: ShadowRoot
	e?: string[] // [value, key, index]
} | number

export type Directive = {
	deps?: Dep
	func(this: Data, el: Element): void
	keep?: boolean
}

export type DirectiveHandler =
	(attr: DOMAttr, attrs: AttrMap) => Directive | void

export type DOM = HTMLElement | MathMLElement | SVGElement
