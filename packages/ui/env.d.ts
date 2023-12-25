/// <reference types="vite/client" />

import { Preprocessor } from 'vite-plugin-emt'

declare global {
	declare const emt: Preprocessor, styl: Preprocessor
}