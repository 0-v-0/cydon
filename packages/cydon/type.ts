export type Data = Record<string, any>

export type Constructor<T> = new (...args: any[]) => T

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Part = {
	deps?: Set<string>
	func: Target['func']
}

export type Target = {
	node: Text | Element
	deps?: Set<string>
	data: Data
	func(this: Data, el: Element): string
}

type AttrMap = Map<string, Part>

/** template result */
export type Result = Partial<Part> & {
	a?: AttrMap // attributes
	r?: Result[]
	s?: ShadowRoot
	e?: string[] // [value, key, index]
} | number

export type Directive = {
	deps?: Set<string>
	func(this: Data, el: Element): void
	keep?: boolean
}

export type DirectiveHandler =
	(attr: DOMAttr, attrs: AttrMap) => Directive | void

export type DOM = HTMLElement | MathMLElement | SVGElement