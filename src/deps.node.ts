export { camelCase } from 'camel-case'
export const cwd = process.cwd
import * as g from 'glob'
export const glob = g
export const inspectCustom = Symbol.for('nodejs.util.inspect.custom')
export { basename, resolve } from 'path'
export { pathToFileURL } from 'url'
export const req = require
export { importModule } from './load-module-native'
