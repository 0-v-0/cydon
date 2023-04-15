export * from './util'

export const load = (name: string) => import(`../components/${name}.ts`)