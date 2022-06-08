type TagProcFunc = (tag: string, list: string[], result: string[]) => string;

declare module 'emmetlite' {
	export const itags: any, tabbr: any, aabbr: any, eabbr: any;

	const Emmet: (input: string, intent?: string, f?: TagProcFunc) => string;
	export default Emmet;
}