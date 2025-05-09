export type Constructor<T> = new (...args: any[]) => T

export type Data = Record<string, any>

export type DataHandler = ProxyHandler<Data>

/** A set of dependencies */
export type Dep = Set<string>

/** A parent node */
export type Container = Element | DocumentFragment

/** A DOM element */
export type DOM = HTMLElement | MathMLElement | SVGElement

export type Part = {
	/** attribute name */
	a?: string
	/** dependencies */
	deps?: Dep
	/** update function */
	f(this: Data, el: Element): any
}

export type Target = Part & {
	/** node */
	n: Element | Text
	/** dependencies */
	deps: Dep
	/** data */
	x: Data
}

/** A map of attributes */
export type AttrMap = Map<string | symbol, Part>

/** template result */
export type Result = Results & {
	/** shadow root */
	s?: ShadowRoot
	/** [value, key, index] */
	e?: string[]
} | Partial<Part>

/** the compiled result of a template */
export type Results = (AttrMap | Result | number)[]

export interface Directive extends Part {
	/**
	 * don't remove the attribute after compiling
	 */
	keep?: boolean
}

/**
 * Directive handling function
 * @param name attribute name
 * @param value attribute value
 * @param el element
 * @param attrs bound attributes
 * @param parent parent node (presents if in c-for)
 */
export type DirectiveHandler = (
	name: string,
	value: string,
	el: Element,
	attrs: AttrMap,
	parent?: ParentNode) => Directive | void
