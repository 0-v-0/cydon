export type TagProp = {
	tag: string
	tags: string[]
	attr: string[]
	content: string
	match: string
	token: string
	result: string[]
}
export type StringMap = {
	[x: string]: string
}

export type TagProcFunc = (prop: TagProp) => boolean | void

declare module 'emmetlite' {
	export const itags: StringMap,
		tabbr: StringMap,
		aabbr: StringMap,
		eabbr: StringMap,
		tagProcs: TagProcFunc[]

	const emmet: (input: string, intent?: string) => string
	export default emmet
}