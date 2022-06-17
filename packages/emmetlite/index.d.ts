export type TagProp = {
	tag: string
	taglist: string[]
	attr: string[]
	content: string
	result: string[]
}
export type StringMap = {
	[x: string]: string
}

export type TagProcFunc = (prop: TagProp) => boolean | void

export type StyleProcFunc = (buffer: string, tag: string, attr: string[], result: string[]) => string

declare module 'emmetlite' {
	export const itags: StringMap,
		tabbr: StringMap,
		aabbr: StringMap,
		eabbr: StringMap,
		tagProcs: TagProcFunc[]

	const Emmet: (input: string, intent?: string, styleProc?: StyleProcFunc) => string
	export default Emmet
}