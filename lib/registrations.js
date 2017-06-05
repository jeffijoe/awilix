const Lifetime = require('./Lifetime')

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

  return {
    setLifetime,
    transient: () => setLifetime(Lifetime.TRANSIENT),
    scoped: () => setLifetime(Lifetime.SCOPED),
    singleton: () => setLifetime(Lifetime.SINGLETON)
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
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts)

  const resolve = (container) => {
    // Try and gather the dependencies of the constructor
    let deps = getDependencies(fn)

    // We have dependencies so we need to resolve them manually
    if (deps.length === 1) {
      if (deps[0] in container.cradle) {
        return fn(container.cradle[deps[0]])
      }
    } else if (deps.length > 1) {
      let children = []
      deps.forEach((d) => children.push(container.cradle[d]))
      return fn(...children)
    }

    // No manual resolution needed
    return fn(container.cradle)
  }

  const result = {
    resolve,
    lifetime: opts.lifetime
  }
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
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts)

  const resolve = (container) => {
    // Try and gather the dependencies of the constructor
    let deps = getDependencies(Type.prototype.constructor)

    // We have dependencies so we need to resolve them manually
    if (deps.length === 1) {
      if (deps[0] in container.cradle) {
        return new Type(container.cradle[deps[0]])
      }
    } else if (deps.length > 1) {
      let children = []
      deps.forEach((d) => children.push(container.cradle[d]))
      return new (Function.prototype.bind.apply(Type, [null, ...children]))
    }

    // Simple 'new' since we do not need manually resolution
    return new Type(container.cradle)
  }

  const result = {
    resolve,
    lifetime: opts.lifetime
  }

  Object.assign(result, makeFluidInterface(result))
  return result
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
function getDependencies(func) {
  if (!func || typeof func !== 'function') {
    return []
  }

  let args = /\(\s*([^)]+?)\s*\)/.exec(func.toString())
  if (args && args[1] && !args[1].includes('{') && !args[1].includes('}')) {
    return args[1].split(/\s*,\s*/)
  }
  return []
}

module.exports.asClass = asClass
