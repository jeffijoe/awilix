const camelCase = require('camel-case')
const Lifetime = require('./Lifetime')
const { isClass, isFunction } = require('./utils')
const registrations = require('./registrations')

const nameFormatters = {
  camelCase
}

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
 * @return {Object}
 * Returns an object describing the result.
 */
module.exports = function loadModules(dependencies, globPatterns, opts) {
  const container = dependencies.container
  opts = optsWithDefaults(opts, container)
  const modules = dependencies.listModules(globPatterns, opts)

  const result = modules.map(m => {
    const loaded = dependencies.require(m.path)

    // Meh, it happens.
    if (!loaded) {
      return undefined
    }

    if (!isFunction(loaded)) {
      if (loaded.default && isFunction(loaded.default)) {
        // ES6 default export
        return {
          name: m.name,
          path: m.path,
          value: loaded.default,
          opts: m.opts
        }
      }

      return undefined
    }

    return {
      name: m.name,
      path: m.path,
      value: loaded,
      opts: m.opts
    }
  })
  result.filter(x => x).forEach(registerDescriptor.bind(null, container, opts))
  return {
    loadedModules: modules
  }
}

/**
 * Returns a new options object with defaults applied.
 */
function optsWithDefaults(opts, container) {
  return Object.assign(
    {},
    {
      // Does a somewhat-deep merge on the registration options.
      registrationOptions: Object.assign(
        {
          lifetime: Lifetime.TRANSIENT,
          resolutionMode: container.options.resolutionMode
        },
        opts && opts.registrationOptions
      )
    },
    opts
  )
}

/**
 * Given a module descriptor, reads it and registers it's value with the container.
 *
 * @param {AwilixContainer} container
 * @param {LoadModulesOptions} opts
 * @param {ModuleDescriptor} moduleDescriptor
 */
function registerDescriptor(container, opts, moduleDescriptor) {
  const inlineConfig = moduleDescriptor.value[registrations.REGISTRATION]
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

  const regOpts = Object.assign(
    {},
    opts.registrationOptions,
    moduleDescriptorOpts
  )

  const reg = regOpts.register
    ? regOpts.register
    : isClass(moduleDescriptor.value)
      ? registrations.asClass
      : registrations.asFunction

  container.register(name, reg(moduleDescriptor.value, regOpts))
}
