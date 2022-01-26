import { basename, cwd, glob, resolve } from './deps.ts'
import { flatten } from './utils.ts'
import { BuildResolverOptions, ResolverOptions } from './resolvers.ts'
import { LifetimeType } from './awilix.ts'

/**
 * The options when invoking listModules().
 * @interface ListModulesOptions
 */
export interface ListModulesOptions {
  cwd?: string
  glob?: typeof glob.sync
}

/**
 * An object containing the module name and path (full path to module).
 *
 * @interface ModuleDescriptor
 */
export interface ModuleDescriptor {
  name: string
  path: string
  opts: any
}
/**
 * Metadata of the module as well as the loaded module itself.
 */
export interface LoadedModuleDescriptor extends ModuleDescriptor {
  value: unknown
}

/**
 * A glob pattern with associated registration options.
 */
export type GlobWithOptions =
  | [string]
  | [string, BuildResolverOptions<any> | LifetimeType]

// Regex to extract the module name.
const nameExpr = /(.*)\..*/i

/**
 * Internal method for globbing a single pattern.
 *
 * @param  {String} globPattern
 * The glob pattern.
 *
 * @param  {String} opts.cwd
 * Current working directory, used for resolving filepaths.
 * Defaults to `process.cwd()`.
 *
 * @return {[{name, path, opts}]}
 * The module names and paths.
 *
 * @api private
 */
function _listModules(
  globPattern: string | GlobWithOptions,
  opts: ListModulesOptions = {}
): Array<ModuleDescriptor> {
  const options = { cwd: cwd(), glob: glob.sync, ...opts }
  let patternOpts: ResolverOptions<any> | null = null
  if (Array.isArray(globPattern)) {
    patternOpts = globPattern[1] as ResolverOptions<any>
    globPattern = globPattern[0]
  }
  const result = options.glob(globPattern, { cwd: options.cwd })
  const mapped = result.map((p) => ({
    name: nameExpr.exec(basename(p))![1],
    path: resolve(options.cwd, p),
    opts: patternOpts,
  }))
  return mapped
}

/**
 * Returns a list of {name, path} pairs,
 * where the name is the module name, and path is the actual
 * full path to the module.
 *
 * @param  {String|Array<String>} globPatterns
 * The glob pattern as a string or an array of strings.
 *
 * @param  {String} opts.cwd
 * Current working directory, used for resolving filepaths.
 * Defaults to `process.cwd()`.
 *
 * @return {[{name, path}]}
 * An array of objects with the module names and paths.
 */
export function listModules(
  globPatterns: string | Array<string | GlobWithOptions>,
  opts?: ListModulesOptions
) {
  if (Array.isArray(globPatterns)) {
    return flatten(globPatterns.map((p) => _listModules(p, opts)))
  }

  return _listModules(globPatterns, opts)
}
