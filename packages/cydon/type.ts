export type Data = Record<string, any>

export type Constructor<T> = new (...args: any[]) => T

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Part = {
	deps?: Dep
	f(this: Data, el: Element): string
}

export type Target = {
	node: Text | Element
	deps: Dep
	data: Data
	f: Part['f']
}

export type Dep = Set<string>

type AttrMap = Map<string, Part>

/** template result */
export type Result = Partial<Part> & {
	/** attributes */
	a?: AttrMap
	/** shadow root */
	s?: ShadowRoot
	e?: string[] // [value, key, index]
	r?: Result[]
} | number

export type Directive = {
	deps?: Dep
	f(this: Data, el: Element): void
	keep?: boolean
}

export type DirectiveHandler =
	(attr: DOMAttr, attrs: AttrMap, parent?: ParentNode) => Directive | void

export type DOM = HTMLElement | MathMLElement | SVGElement
