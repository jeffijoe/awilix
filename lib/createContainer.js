const util = require('util')
const { last, nameValueToObject } = require('./utils')
const loadModules = require('./loadModules')
const listModules = require('./listModules')
const { asClass, asFunction, asValue } = require('./registrations')
const ResolutionMode = require('./ResolutionMode')
const AwilixResolutionError = require('./AwilixResolutionError')
const AwilixError = require('./AwilixError')
const Lifetime = require('./Lifetime')

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
module.exports = function createContainer(options, __parentContainer) {
  options = Object.assign(
    {
      resolutionMode: ResolutionMode.PROXY
    },
    options
  )

  // The resolution stack is used to keep track
  // of what modules are being resolved, so when
  // an error occurs, we have something to present
  // to the poor developer who fucked up.
  let resolutionStack = []

  // For performance reasons, we store
  // the rolled-up registrations when starting a resolve.
  let __computedRegistrations = null

  // Internal registration store.
  const registrations = {}

  /**
   * Used by util.inspect (which is used by console.log).
   */
  const inspect = (depth, opts) => {
    return `[AwilixContainer (${__parentContainer
      ? 'scoped, '
      : ''}registrations: ${Object.keys(container.registrations).length})]`
  }

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
    get registrations() {
      return rollUpRegistrations()
    },

    /**
     * Used by util.inspect (which is used by console.log).
     */
    inspect,
    [util.inspect.custom]: inspect
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
    require:
      options.require ||
      function(uri) {
        return require(uri)
      },
    listModules: listModules,
    container: container
  }

  /**
   * The `Proxy` that is passed to functions so they can resolve their dependencies without
   * knowing where they come from. I call it the "cradle" because
   * it is where registered things come to life at resolution-time.
   */
  const cradle = new Proxy(
    {},
    {
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
        throw new Error(
          `Attempted setting property "${name}" on container cradle - this is not allowed.`
        )
      },

      /**
       * Used for `Object.keys`.
       */
      ownKeys() {
        return Array.from(cradle)
      },

      /**
       * Used for `Object.keys`.
       */
      getOwnPropertyDescriptor(target, key) {
        const regs = rollUpRegistrations()
        if (Object.getOwnPropertyDescriptor(regs, key)) {
          return {
            enumerable: true,
            configurable: true
          }
        }

        return undefined
      }
    }
  )

  container.cradle = cradle

  /**
   * Rolls up registrations from the family tree.
   *
   * @return {object}
   * The merged registrations object.
   */
  const rollUpRegistrations = () => {
    if (__computedRegistrations) {
      return __computedRegistrations
    }

    __computedRegistrations = Object.assign(
      {},
      __parentContainer && __parentContainer.registrations,
      registrations
    )

    return __computedRegistrations
  }

  /**
   * Used for providing an iterator to the cradle.
   */
  const registrationNamesIterator = function*() {
    const registrations = rollUpRegistrations()
    for (const registrationName in registrations) {
      yield registrationName
    }
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
    const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
    for (const key of keys) {
      const value = obj[key]
      registrations[key] = value
    }
    // Invalidates the computed registrations.
    __computedRegistrations = null
    return container
  }

  container.register = register

  /**
   * Makes a register function.
   *
   * @param {Function} fn
   * The `as*` function to make a register function for.
   *
   * @param {Boolean} verbatimValue
   * The `('name', [value, opts])` is not valid for all register functions.
   * When set to true, treat the value as-is, don't check if its an value-opts-array.
   */
  const makeRegister = (fn, verbatimValue) =>
    function registerShortcut(name, value, opts) {
      // Supports infering the class/function name.
      if (typeof name === 'function' && !verbatimValue) {
        if (!name.name) {
          throw new AwilixError(
            `Attempted to use shorthand register function, but the specified function has no name.`
          )
        }
        opts = value
        value = name
        name = name.name
      }
      // This ensures that we can support name+value style and object style.
      const obj = nameValueToObject(name, value)
      const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
      for (const key of keys) {
        let valueToRegister = obj[key]

        // If we have options, copy them over.
        let regOpts = Object.assign({}, opts)

        if (!verbatimValue && Array.isArray(valueToRegister)) {
          let arrayOpts = valueToRegister[1]
          // // The ('name', [value, opts]) style
          if (typeof arrayOpts === 'string') {
            // opts is a Lifetime.
            arrayOpts = { lifetime: arrayOpts }
          }

          regOpts = Object.assign({}, regOpts, arrayOpts)
          valueToRegister = valueToRegister[0]
        }

        register(key, fn(valueToRegister, regOpts))
      }

      // Chaining
      return container
    }

  /**
   * Returned to `util.inspect` when attempting to resolve
   * a custom inspector function on the cradle.
   */
  const inspectCradle = () => '[AwilixContainer.cradle]'

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
  container.registerValue = makeRegister(asValue, /* verbatimValue: */ true)

  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  const resolve = name => {
    if (!__computedRegistrations) {
      rollUpRegistrations()
    }

    // We need a reference to the root container,
    // so we can retrieve and store singletons.
    const root = last(familyTree)

    try {
      // Grab the registration by name.
      const registration = __computedRegistrations[name]
      if (resolutionStack.indexOf(name) > -1) {
        throw new AwilixResolutionError(
          name,
          resolutionStack,
          'Cyclic dependencies detected.'
        )
      }

      // Used in console.log.
      if (name === 'constructor') {
        return createContainer
      }

      if (!registration) {
        // The following checks ensure that console.log on the cradle does not
        // throw an error (issue #7).
        if (name === util.inspect.custom || name === 'inspect') {
          return inspectCradle
        }

        // When using `Array.from` or spreading the cradle, this will
        // return the registration names.
        if (name === Symbol.iterator) {
          return registrationNamesIterator
        }

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
          throw new AwilixResolutionError(
            name,
            resolutionStack,
            `Unknown lifetime "${registration.lifetime}"`
          )
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
        __computedRegistrations = null
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
