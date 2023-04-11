export type Constructor<T> = new (...args: any[]) => T

export type Data = Record<string, any>

export type DataHandler = ProxyHandler<Data>

export type Dep = Set<string>

export type Container = Element | DocumentFragment

export type DOM = HTMLElement | MathMLElement | SVGElement

export type DOMAttr = Attr & {
	ownerElement: Element
}

export type Part = {
	/** attribute name */
	a?: string
	/** dependencies */
	deps?: Dep
	/** update function */
	f(this: Data, el: Element): any
}

export type Target = Part & {
	node: Element | Text
	/** dependencies */
	deps: Dep
	data: Data
}

export type AttrMap = Map<string | symbol, Part>

/** template result */
export type Result = Results & {
	/** shadow root */
	s?: ShadowRoot
	e?: string[] // [value, key, index]
} | Partial<Part>

export type Results = (AttrMap | Result | number)[]

export interface Directive extends Part {
	/**
	 * don't remove the attribute after compiling
	 */
	keep?: boolean
}

/**
 * Directive handling function
 * @param attr DOM attribute
 * @param attrs bound attributes
 * @param parent parent node (presents if in c-for)
 */
export type DirectiveHandler =
	(attr: DOMAttr, attrs: AttrMap, parent?: ParentNode) => Directive | void
