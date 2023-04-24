export * from './AsyncLoad'
export * from './CAsync'
export * from './ClipboardCopy'
export * from './CTip'
export * from './FileAttachment'
export * from './ImageCrop'
export * from './IncludeFragment'
export * from './ListElement'
export * from './TabContainer'

export const load = (name: string) => import(`../components/${name}.ts`)
