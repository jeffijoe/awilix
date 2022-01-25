export { camelCase } from 'https://esm.sh/camel-case'
export const cwd = Deno.cwd
import { expandGlobSync } from 'https://deno.land/std@0.122.0/fs/mod.ts'
export const glob = {
  // TODO: employ some better glob matching which actually can make use of options
  sync: (pattern: string, _options?: unknown) =>
    [...expandGlobSync(pattern)].map((e) => e.path),
}
export const inspectCustom = Symbol.for('Deno.customInspect')
export {
  basename,
  resolve,
  toFileUrl as pathToFileURL,
} from 'https://deno.land/std@0.122.0/path/mod.ts'
export const req = (path: string) => {
  throw new Error(
    `'require' is unsupported on Deno, please specify 'esModules'! Trying to load: '${path}'`
  )
}
