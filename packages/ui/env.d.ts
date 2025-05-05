/// <reference types="vite/client" />

import { Preprocessor } from 'unplugin-emt-styl'

declare global {
	declare const emt: Preprocessor, styl: Preprocessor
}