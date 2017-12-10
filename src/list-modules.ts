import * as glob from 'glob'
import * as path from 'path'
import { flatten } from './utils'
import { ResolverOptions } from './resolvers'

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
 * A glob pattern with associated registration options.
 */
export type GlobWithOptions = [string] | [string, ResolverOptions<any>]

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
  opts?: ListModulesOptions
): Array<ModuleDescriptor> {
  opts = { cwd: process.cwd(), glob: glob.sync, ...opts }
  let patternOpts: ResolverOptions<any> | null = null
  if (globPattern instanceof Array) {
    patternOpts = globPattern[1] as ResolverOptions<any>
    globPattern = globPattern[0]
  }

  const result = opts.glob!(globPattern, { cwd: opts.cwd })
  const mapped = result.map(p => ({
    name: nameExpr.exec(path.basename(p))![1],
    path: path.resolve(opts!.cwd, p),
    opts: patternOpts
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
    return flatten(globPatterns.map(p => _listModules(p, opts)))
  }

  return _listModules(globPatterns, opts)
}
