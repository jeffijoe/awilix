const Lifetime = require('./Lifetime')
const ResolutionModes = require('./ResolutionMode')

/**
 * Makes an options object based on defaults.
 *
 * @param  {object} defaults
 * Default options.
 *
 * @param  {*} input
 * The input to check and possibly assign to the resulting object
 * .
 * @return {object}
 */
const makeOptions = (defaults, input) => {
  return Object.assign({}, defaults, input)
}

/**
 * Given an options object, creates a fluid interface
 * to manage it.
 *
 * @param {*} returnValue
 * The object to return.
 *
 * @param  {object} opts
 * The options to manage.
 *
 * @return {object}
 * The interface.
 */
const makeFluidInterface = (obj) => {
  const setLifetime = (value) => {
    obj.lifetime = value
    return obj
  }

  const setResolutionMode = (value) => {
    obj.resolutionMode = value
    return obj
  }

  return {
    setLifetime,
    transient: () => setLifetime(Lifetime.TRANSIENT),
    scoped: () => setLifetime(Lifetime.SCOPED),
    singleton: () => setLifetime(Lifetime.SINGLETON),
    setResolutionMode,
    proxy: () => setResolutionMode(ResolutionModes.PROXY),
    classic: () => setResolutionMode(ResolutionModes.CLASSIC)
  }
}

/**
 * Creates a simple value registration where the given value will always be resolved.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {*} value
 * The value to resolve.
 *
 * @return {object}
 * The registration.
 */
const asValue = (value) => {
  const resolve = () => {
    return value
  }

  return {
    resolve,
    lifetime: Lifetime.TRANSIENT
  }
}

module.exports.asValue = asValue

/**
 * Creates a factory registration, where the given factory function
 * will be invoked with `new` when requested.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {Function} fn
 * The function to register.
 *
 * @param {object} opts
 * Additional options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const asFunction = (fn, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT,
    resolutionMode: ResolutionModes.PROXY
  }

  opts = makeOptions(defaults, opts)

  const resolve = function (container) {
    if (!this.resolutionMode || this.resolutionMode === ResolutionModes.PROXY) {
      return fn(container.cradle)
    } else {
      // Try and gather the dependencies of the constructor
      let deps = getDependencies(fn)

      // We have dependencies so we need to resolve them manually
      if (deps.length > 0) {
        let children = []
        deps.forEach((d) => children.push(container.cradle[d]))
        return fn(...children)
      }
      return fn()
    }
  }

  const result = {
    resolve,
    lifetime: opts.lifetime,
    resolutionMode: opts.resolutionMode
  }
  result.resolve = resolve.bind(result)
  Object.assign(result, makeFluidInterface(result))
  return result
}

module.exports.asFunction = asFunction

/**
 * Like a factory registration, but for classes that require `new`.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {Class} Type
 * The function to register.
 *
 * @param {object} opts
 * Additional options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const asClass = (Type, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT,
    resolutionMode: ResolutionModes.PROXY
  }

  opts = makeOptions(defaults, opts)

  const resolve = function (container) {
    if (!this.resolutionMode || this.resolutionMode === ResolutionModes.PROXY) {
      return new Type(container.cradle)
    } else {
      // Try and gather the dependencies of the constructor
      let deps = getDependencies(Type.prototype.constructor)

      // We have dependencies so we need to resolve them manually
      if (deps.length > 0) {
        let children = []
        deps.forEach((d) => children.push(container.cradle[d]))
        return new (Function.prototype.bind.apply(Type, [null, ...children]))
      }
      return new Type()
    }
  }

  const result = {
    resolve,
    lifetime: opts.lifetime,
    resolutionMode: opts.resolutionMode
  }
  result.resolve = resolve.bind(result)
  Object.assign(result, makeFluidInterface(result))

  return result
}

/**
 * Returns a function used to invoke a type constructor.
 *
 * @param {Class} Type
 * The type being contructed.
 *
 * @return {Function}
 * The function that constructs the specified type
 */
function buildNewClassFunction(Type) {
  return (dependencies) => {
    return new Type(...dependencies)
  }
}

/**
 * Returns a resolve function used to construct the dependency graph
 *
 * @param {Function} fn
 * The function to construct
 *
 * @param {Function} getDependencies
 * A function used to get the dependencies of the construction target
 *
 * @return {Function}
 * The function used for dependency resolution
 */
function generateResolve(fn, getDependencies) {
  return (container) => {
    if (!this.resolutionMode || this.resolutionMode === ResolutionModes.PROXY) {
      return fn(container.cradle)
    } else {
      // Try and gather the dependencies of the constructor
      let deps = getDependencies()

      // We have dependencies so we need to resolve them manually
      if (deps.length > 0) {
        let children = []
        deps.forEach((d) => children.push(container.cradle[d]))
        return fn(...children)
      }
      return fn()
    }
  }
}

/**
 * Runs a regex on a function to return dependencies
 *
 * @param {function} function
 * A function to test
 *
 * @return {Array<string>}
 * returns an array of depndency names
 */
function getDependencies (func) {
  let args = /\(\s*([^)]+?)\s*\)/.exec(func.toString())
  if (args && args[1] && !args[1].includes('{') && !args[1].includes('}')) {
    return args[1].split(/\s*,\s*/)
  }
  return []
}

module.exports.asClass = asClass
