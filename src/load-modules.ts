import {
  ModuleDescriptor,
  ModuleDescriptorVal,
  GlobWithOptions,
  listModules,
} from './list-modules'
import { Lifetime } from './lifetime'
import {
  RESOLVER,
  asClass,
  asFunction,
  BuildResolverOptions,
} from './resolvers'
import { AwilixContainer } from './container'
import { isClass, isFunction } from './utils'
import { BuildResolver } from './awilix'
import { camelCase } from 'camel-case'
import { importModule } from './load-module-native.js'
/**
 * The options when invoking loadModules().
 * @interface LoadModulesOptions
 */
export interface LoadModulesOptions<ESM extends boolean> {
  cwd?: string
  formatName?: NameFormatter | BuiltInNameFormatters
  resolverOptions?: BuildResolverOptions<any>
  esModules?: ESM
}

/**
 * Name formatting options when using loadModules().
 * @type BuiltInNameFormatters
 */
export type BuiltInNameFormatters = 'camelCase'

/**
 * Takes in the filename of the module being loaded as well as the module descriptor,
 * and returns a string which is used to register the module in the container.
 *
 * `descriptor.name` is the same as `name`.
 *
 * @type {NameFormatter}
 */
export type NameFormatter = (
  name: string,
  descriptor: ModuleDescriptor
) => string

/**
 * Dependencies for `loadModules`
 */
export interface LoadModulesDeps {
  listModules: typeof listModules
  container: AwilixContainer
  require(path: string): any
}

const nameFormatters: Record<string, NameFormatter> = {
  camelCase: (s) => camelCase(s),
}

export interface LoadModulesResult {
  loadedModules: Array<ModuleDescriptor>
}

export function loadModules<ESM extends boolean = false>(
  dependencies: LoadModulesDeps,
  globPatterns: string | Array<string | GlobWithOptions>,
  opts?: LoadModulesOptions<ESM>
): ESM extends true ? Promise<LoadModulesResult> : LoadModulesResult
/**
 * Given an array of glob strings, will call `require`
 * on them, and call their default exported function with the
 * container as the first parameter.
 *
 * @param  {AwilixContainer} dependencies.container
 * The container to install loaded modules in.
 *
 * @param  {Function} dependencies.listModules
 * The listModules function to use for listing modules.
 *
 * @param  {Function} dependencies.require
 * The require function - it's a dependency because it makes testing easier.
 *
 * @param  {String[]} globPatterns
 * The array of globs to use when loading modules.
 *
 * @param  {Object} opts
 * Passed to `listModules`, e.g. `{ cwd: '...' }`.
 *
 * @param  {(string, ModuleDescriptor) => string} opts.formatName
 * Used to format the name the module is registered with in the container.
 *
 * @param  {boolean} opts.esModules
 * Set to `true` to use Node's native ECMAScriptModules modules
 *
 * @return {Object}
 * Returns an object describing the result.
 */
export function loadModules<ESM extends boolean>(
  dependencies: LoadModulesDeps,
  globPatterns: string | Array<string | GlobWithOptions>,
  opts?: LoadModulesOptions<ESM>
): Promise<LoadModulesResult> | LoadModulesResult {
  const container = dependencies.container
  opts = optsWithDefaults(opts, container)
  const modules = dependencies.listModules(globPatterns, opts)

  if (opts?.esModules) {
    return loadEsModules(container, modules, opts)
  } else {
    const result = modules.map((m) => {
      const loaded = dependencies.require(m.path)
      return parseLoadedModule(loaded, m)
    })
    return registerModules(result, container, modules, opts)
  }
}

/**
 * Loads the modules using native ES6 modules and the async import()
 * @param {AwilixContainer} container
 * @param {ModuleDescriptor[]} modules
 * @param {LoadModulesOptions} opts
 */
async function loadEsModules<ESM extends boolean>(
  container: AwilixContainer,
  modules: ModuleDescriptor[],
  opts: LoadModulesOptions<ESM>
): Promise<LoadModulesResult> {
  const importPromises = []
  for (const m of modules) {
    importPromises.push(importModule(m.path))
  }
  const imports = await Promise.all(importPromises)
  const result = []
  for (let i = 0; i < modules.length; i++) {
    result.push(parseLoadedModule(imports[i], modules[i]))
  }
  return registerModules(result, container, modules, opts)
}

/**
 * Parses the module which has been required
 *
 * @param {any} loaded
 * @param {ModuleDescriptor} m
 */
function parseLoadedModule(
  loaded: any,
  m: ModuleDescriptor
): Array<ModuleDescriptorVal> {
  const items: Array<ModuleDescriptorVal> = []
  // Meh, it happens.
  if (!loaded) {
    return items
  }

  if (isFunction(loaded)) {
    // for module.exports = ...
    items.push({
      name: m.name,
      path: m.path,
      value: loaded,
      opts: m.opts,
    })

    return items
  }

  if (loaded.default && isFunction(loaded.default)) {
    // ES6 default export
    items.push({
      name: m.name,
      path: m.path,
      value: loaded.default,
      opts: m.opts,
    })
  }

  // loop through non-default exports, but require the RESOLVER property set for
  // it to be a valid service module export.
  for (const key of Object.keys(loaded)) {
    if (key === 'default') {
      // default case handled separately due to its different name (file name)
      continue
    }

    if (isFunction(loaded[key]) && RESOLVER in loaded[key]) {
      items.push({
        name: key,
        path: m.path,
        value: loaded[key],
        opts: m.opts,
      })
    }
  }

  return items
}

/**
 * Registers the modules
 *
 * @param {ModuleDescriptorVal[][]} modulesToRegister
 * @param {AwilixContainer} container
 * @param {ModuleDescriptor[]} modules
 * @param {LoadModulesOptions} opts
 */
function registerModules<ESM extends boolean>(
  modulesToRegister: ModuleDescriptorVal[][],
  container: AwilixContainer,
  modules: ModuleDescriptor[],
  opts: LoadModulesOptions<ESM>
): LoadModulesResult {
  modulesToRegister
    .reduce((acc, cur) => acc.concat(cur), [])
    .filter((x) => x)
    .forEach(registerDescriptor.bind(null, container, opts))
  return {
    loadedModules: modules,
  }
}

/**
 * Returns a new options object with defaults applied.
 */
function optsWithDefaults<ESM extends boolean = false>(
  opts: Partial<LoadModulesOptions<ESM>> | undefined,
  container: AwilixContainer
): LoadModulesOptions<ESM> {
  return {
    // Does a somewhat-deep merge on the registration options.
    resolverOptions: {
      lifetime: Lifetime.TRANSIENT,
      ...(opts && opts.resolverOptions),
    },
    ...opts,
  }
}

/**
 * Given a module descriptor, reads it and registers it's value with the container.
 *
 * @param {AwilixContainer} container
 * @param {LoadModulesOptions} opts
 * @param {ModuleDescriptor} moduleDescriptor
 */
function registerDescriptor<ESM extends boolean = false>(
  container: AwilixContainer,
  opts: LoadModulesOptions<ESM>,
  moduleDescriptor: ModuleDescriptor & { value: any }
) {
  const inlineConfig = moduleDescriptor.value[RESOLVER]
  let name = inlineConfig && inlineConfig.name
  if (!name) {
    name = moduleDescriptor.name
    let formatter = opts.formatName
    if (formatter) {
      if (typeof formatter === 'string') {
        formatter = nameFormatters[formatter]
      }

      if (formatter) {
        name = formatter(name, moduleDescriptor)
      }
    }
  }

  let moduleDescriptorOpts = moduleDescriptor.opts

  if (typeof moduleDescriptorOpts === 'string') {
    moduleDescriptorOpts = { lifetime: moduleDescriptorOpts }
  }

  const regOpts: BuildResolver<any> = {
    ...opts.resolverOptions,
    ...moduleDescriptorOpts,
    ...inlineConfig,
  }

  const reg: Function = regOpts.register
    ? regOpts.register
    : isClass(moduleDescriptor.value)
    ? asClass
    : asFunction

  container.register(name, reg(moduleDescriptor.value, regOpts))
}
