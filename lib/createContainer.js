const loadModules = require('./loadModules')
const listModules = require('./listModules')
const { asClass, asFunction, asValue } = require('./registrations')
const AwilixResolutionError = require('./AwilixResolutionError')
const nameValueToObject = require('./nameValueToObject')
const Lifetime = require('./Lifetime')
const last = require('./last')

/**
 * Family tree symbol.
 * @type {Symbol}
 */
const FAMILY_TREE = Symbol('familyTree')

/**
 * Creates an Awilix container instance.
 *
 * @param {Function} options.require
 * The require function to use. Defaults to require.
 *
 * @param {string} options.resolutionMode
 * The mode used by the container to resolve dependencies. Defaults to 'Proxy'.
 *
 * @return {object}
 * The container.
 */
module.exports = function createContainer (options, __parentContainer) {
  options = Object.assign({}, options)

  // The resolution stack is used to keep track
  // of what modules are being resolved, so when
  // an error occurs, we have something to present
  // to the poor developer who fucked up.
  let resolutionStack = []

  // For performance reasons, we store
  // the rolled-up registrations when starting a resolve.
  let __tempRegistrations = null

  // Internal registration store.
  const registrations = {}

  // The container being exposed.
  const container = {
    /**
     * Store the options on the container
     */
    options,
    /**
     * Getter for the rolled up registrations that merges the container family tree.
     *
     * @return {object}
     */
    get registrations () {
      return rollUpRegistrations()
    },

    /**
     * Used by util.inspect (which us used by console.log).
     */
    inspect: (depth, opts) => {
      return `[AwilixContainer (${__parentContainer ? 'scoped, ' : ''}registrations: ${Object.keys(container.registrations).length})]`
    }
  }

  // Track the family tree.
  const familyTree = __parentContainer
    ? [container].concat(__parentContainer[FAMILY_TREE])
    : [container]

  /**
   * The family tree, used for scoping.
   *
   * @api private
   * @type {object[]}
   */
  container[FAMILY_TREE] = familyTree

  /**
   * We need a cache for storing singletons and scoped resolutions.
   * The key is the registration name, value is the resolved.. value.
   * @type {object}
   */
  container.cache = {}

  // Partially applied to the loadModules function.
  const _loadModulesDeps = {
    require: options.require || function (uri) { return require(uri) },
    listModules: listModules,
    container: container
  }

  /**
   * The `Proxy` that is passed to functions so they can resolve their dependencies without
   * knowing where they come from. I call it the "cradle" because
   * it is where registered things come to life at resolution-time.
   */
  const cradle = new Proxy({}, {
    /**
     * The `get` handler is invoked whenever a get-call for `container.cradle.*` is made.
     *
     * @param  {object} target
     * The proxy target. Irrelevant.
     *
     * @param  {string} name
     * The property name.
     *
     * @return {*}
     * Whatever the resolve call returns.
     */
    get: (target, name) => resolve(name),

    /**
     * Setting things on the cradle throws an error.
     *
     * @param  {object} target
     * @param  {string} name
     */
    set: (target, name, value) => {
      throw new Error(`Attempted setting property "${name}" on container cradle - this is not allowed.`)
    }
  })

  container.cradle = cradle

  /**
   * Rolls up registrations from the family tree.
   *
   * @return {object}
   * The merged registrations object.
   */
  const rollUpRegistrations = () => {
    return Object.assign(
      {},
      __parentContainer && __parentContainer.registrations,
      registrations
    )
  }

  /**
   * Creates a scoped container.
   *
   * @return {object}
   * The scoped container.
   */
  const createScope = () => {
    return createContainer(options, container)
  }

  container.createScope = createScope

  /**
   * Adds a registration that has been manually constructed.
   *
   * @param  {Registration}
   * registration
   *
   * @return {object}
   * The container.
   */
  const register = (name, registration) => {
    const obj = nameValueToObject(name, registration)
    for (let key in obj) {
      const value = obj[key]
      registrations[key] = value
    }

    return container
  }

  container.register = register

  /**
   * Makes a register function.
   */
  const makeRegister = (fn) => (name, value, opts) => {
    // This ensures that we can support name+value style and object style.
    const obj = nameValueToObject(name, value)

    for (let key in obj) {
      let valueToRegister = obj[key]

      // If we have options, copy them over.
      opts = Object.assign({}, opts)

      // copy the resolution mode
      opts.resolutionMode = (opts.resolutionMode || options.resolutionMode)

      if (Array.isArray(valueToRegister)) {
        // The ('name', [value, opts]) style
        opts = Object.assign({}, opts, valueToRegister[1])
        valueToRegister = valueToRegister[0]
      }

      register(key, fn(valueToRegister, opts))
    }

    // Chaining
    return container
  }

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerFunction = makeRegister(asFunction)

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerClass = makeRegister(asClass)

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerValue = makeRegister(asValue)

  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  const resolve = (name) => {
    if (!__tempRegistrations) {
      __tempRegistrations = rollUpRegistrations()
    }

    // We need a reference to the root container,
    // so we can retrieve and store singletons.
    const root = last(familyTree)

    try {
      // Grab the registration by name.
      const registration = __tempRegistrations[name]
      if (resolutionStack.indexOf(name) > -1) {
        throw new AwilixResolutionError(name, resolutionStack, 'Cyclic dependencies detected.')
      }

      if (!registration) {
        throw new AwilixResolutionError(name, resolutionStack)
      }

      // Pushes the currently-resolving module name onto the stack
      resolutionStack.push(name)

      // Do the thing
      let cached, resolved
      switch (registration.lifetime) {
        case Lifetime.TRANSIENT:
          // Transient lifetime means resolve every time.
          resolved = registration.resolve(container)
          break
        case Lifetime.SINGLETON:
          // Singleton lifetime means cache at all times, regardless of scope.
          cached = root.cache[name]
          if (cached === undefined) {
            resolved = registration.resolve(container)
            root.cache[name] = resolved
          } else {
            resolved = cached
          }
          break
        case Lifetime.SCOPED:
          // Scoped lifetime means that the container
          // that resolves the registration also caches it.
          // When a registration is not found, we travel up
          // the family tree until we find one that is cached.

          // Note: The first element in the family tree is this container.
          for (const c of familyTree) {
            cached = c.cache[name]
            if (cached !== undefined) {
            // We found one!
              resolved = cached
              break
            }
          }

          // If we still have not found one, we need to resolve and cache it.
          if (cached === undefined) {
            resolved = registration.resolve(container)
            container.cache[name] = resolved
          }
          break
        default:
          throw new AwilixResolutionError(name, resolutionStack, `Unknown lifetime "${registration.lifetime}"`)
      }
      // Pop it from the stack again, ready for the next resolution
      resolutionStack.pop()
      return resolved
    } catch (err) {
      // When we get an error we need to reset the stack.
      resolutionStack = []
      throw err
    } finally {
      // Clear the temporary registrations
      // so we get a fresh one next time.
      if (!resolutionStack.length) {
        __tempRegistrations = null
      }
    }
  }

  container.resolve = resolve

  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * Additionally, any modules using the `dependsOn` API
   * will be resolved.
   *
   * @see lib/loadModules.js documentation.
   */
  container.loadModules = (globPatterns, opts) => {
    loadModules(_loadModulesDeps, globPatterns, opts)
    return container
  }

  /**
   * Shortcut to the `lib/listModules` function.
   *
   * @see lib/listModules.js documentation.
   */
  container.listModules = listModules

  // Finally return the container
  return container
}
