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

export type TagProcess = (prop: TagProp) => boolean | void

export const itags: StringMap,
	tabbr: StringMap,
	aabbr: StringMap,
	eabbr: StringMap,
	tagProcs: TagProcess[]

const emmet: (input: string, intent?: string) => string
export default emmet