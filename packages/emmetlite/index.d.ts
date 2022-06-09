export type TagProp = {
	tag: string
	taglist: string[]
	attr: string[]
	content: string
	result: string[]
	next: TagProcFunc
}

export type TagProcFunc = (prop: TagProp) => string;

export type StyleProcFunc = (buffer: string, buffertag: string, attr: string[], result: string[]) => string;

declare module 'emmetlite' {
	export const itags: any, tabbr: any, aabbr: any, eabbr: any;

	const Emmet: (input: string, intent?: string, tagProc?: TagProcFunc, styleProc?: StyleProcFunc) => string;
	export default Emmet;
}