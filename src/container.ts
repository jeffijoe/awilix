import * as util from 'util'
import { GlobWithOptions, listModules } from './list-modules'
import {
  LoadModulesOptions,
  loadModules as realLoadModules
} from './load-modules'
import {
  Resolver,
  Constructor,
  ResolverOptions,
  asClass,
  asFunction,
  asValue
} from './resolvers'
import { last, nameValueToObject, isClass } from './utils'
import { InjectionMode, InjectionModeType } from './injection-mode'
import { Lifetime, LifetimeType } from './lifetime'
import { AwilixResolutionError, AwilixTypeError, AwilixError } from './errors'

/**
 * The container returned from createContainer has some methods and properties.
 * @interface AwilixContainer
 */
export interface AwilixContainer {
  /**
   * Options the container was configured with.
   */
  options: ContainerOptions
  /**
   * The proxy injected when using `PROXY` injection mode.
   * Can be used as-is.
   */
  readonly cradle: { [key: string]: any } & Iterable<string>
  /**
   * Getter for the rolled up registrations that merges the container family tree.
   */
  readonly registrations: RegistrationHash
  /**
   * Resolved modules cache.
   */
  readonly cache: { [key: string]: any }
  /**
   * Creates a scoped container with this one as the parent.
   */
  createScope(): AwilixContainer
  /**
   * Used by `util.inspect`.
   */
  inspect(depth: number, opts?: any): string
  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * Additionally, any modules using the `dependsOn` API
   * will be resolved.
   *
   * @see src/load-modules.ts documentation.
   */
  loadModules(
    globPatterns: Array<string | GlobWithOptions>,
    options?: LoadModulesOptions
  ): this
  /**
   * Adds a single registration that using a pre-constructed resolver.
   */
  register<T>(name: string | symbol, registration: Resolver<T>): this
  /**
   * Pairs resolvers to registration names and registers them.
   */
  register(nameAndRegistrationPair: NameAndRegistrationPair): this
  /**
   * Registers a class that will be instantiated when resolved,
   * using it's `name` property as the registration name.
   */
  registerClass<T>(
    ctor: Constructor<T>,
    opts?: RegistrationOptionsOrLifetime<T>
  ): this
  /**
   * Registers a class that will be instantiated when resolved.
   */
  registerClass<T>(
    name: string | symbol,
    ctor: Constructor<T>,
    opts?: RegistrationOptionsOrLifetime<T>
  ): this
  /**
   * Registers a class with options.
   */
  registerClass<T>(
    name: string | symbol,
    ctorAndOptionsPair: [Constructor<T>, RegistrationOptionsOrLifetime<T>]
  ): this
  /**
   * Pairs classes to registration names and registers them.
   */
  registerClass(nameAndClassPair: RegisterNameAndClassPair): this
  /**
   * Registers the given value as a function that will be invoked
   * with dependencies when resolved, using it's `name` property as the
   * registration name.
   */
  registerFunction(
    fn: Function,
    opts?: RegistrationOptionsOrLifetime<any>
  ): this
  /**
   * Registers the given value as a function that will be invoked
   * with dependencies when resolved.
   */
  registerFunction(
    name: string | symbol,
    fn: Function,
    opts?: RegistrationOptionsOrLifetime<any>
  ): this
  /**
   * Registers a function with options.
   */
  registerFunction(
    name: string | symbol,
    funcAndOptionsPair: [Function, RegistrationOptionsOrLifetime<any>]
  ): this
  /**
   * Pairs functions to registration names and registers them.
   */
  registerFunction(nameAndFunctionPair: RegisterNameAndFunctionPair): this
  /**
   * Registers the given value as-is.
   */
  registerValue(name: string | symbol, value: any): this
  /**
   * Pairs values to registration names and registers them.
   */
  registerValue(nameAndValuePairs: RegisterNameAndValuePair): this
  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  resolve<T>(name: string | symbol, resolveOptions?: ResolveOptions): T
  /**
   * Given a resolver, class or function, builds it up and returns it.
   * Does not cache it, this means that any lifetime configured in case of passing
   * a resolver will not be used.
   *
   * @param {Resolver|Class|Function} targetOrResolver
   * @param {ResolverOptions} opts
   */
  build<T>(
    targetOrResolver: ClassOrFunctionReturning<T> | Resolver<T>,
    opts?: ResolverOptions<T>
  ): T
}

/**
 * Optional resolve options.
 */
export interface ResolveOptions {
  /**
   * If `true` and `resolve` cannot find the requested dependency,
   * returns `undefined` rather than throwing an error.
   */
  allowUnregistered?: boolean
}

/**
 * Registration options or a lifetime type.
 */
export type RegistrationOptionsOrLifetime<T> = ResolverOptions<T> | LifetimeType

/**
 * Register a Registration
 * @interface NameAndRegistrationPair
 */
export interface NameAndRegistrationPair {
  [key: string]: Resolver<any>
}

/**
 * Register a class.
 * @interface RegisterNameAndClassPair
 */
export interface RegisterNameAndClassPair {
  [key: string]:
    | [Constructor<any>, RegistrationOptionsOrLifetime<any>]
    | Constructor<any>
}

/**
 * Register a function.
 * @interface RegisterNameAndFunctionPair
 */
export interface RegisterNameAndFunctionPair {
  [key: string]:
    | [FunctionReturning<any>, RegistrationOptionsOrLifetime<any>]
    | FunctionReturning<any>
}

/**
 * Register a value.
 * @interface RegisterNameAndValuePair
 */
export interface RegisterNameAndValuePair {
  [key: string]: any
}

/**
 * Function that returns T.
 */
export type FunctionReturning<T> = (...args: Array<any>) => T

/**
 * A class or function returning T.
 */
export type ClassOrFunctionReturning<T> = FunctionReturning<T> | Constructor<T>

/**
 * The options for the createContainer function.
 * @interface ContainerOptions
 */
export interface ContainerOptions {
  require?: (id: string) => any
  injectionMode?: InjectionModeType
}

/**
 * Contains a hash of registrations where the name is the key.
 */
export interface RegistrationHash {
  [key: string]: Resolver<any>
}

/**
 * Resolution stack.
 */
export interface ResolutionStack extends Array<string | symbol> {}

/**
 * Family tree symbol.
 * @type {Symbol}
 */
const FAMILY_TREE = Symbol('familyTree')

/**
 * Roll Up Registrations symbol.
 * @type {Symbol}
 */
const ROLL_UP_REGISTRATIONS = Symbol('rollUpRegistrations')

/**
 * Creates an Awilix container instance.
 *
 * @param {Function} options.require
 * The require function to use. Defaults to require.
 *
 * @param {string} options.injectionMode
 * The mode used by the container to resolve dependencies. Defaults to 'Proxy'.
 *
 * @return {object}
 * The container.
 */
export function createContainer(
  options?: ContainerOptions,
  parentContainer?: AwilixContainer
): AwilixContainer {
  options = Object.assign(
    {
      injectionMode: InjectionMode.PROXY
    },
    options
  )

  // The resolution stack is used to keep track
  // of what modules are being resolved, so when
  // an error occurs, we have something to present
  // to the poor developer who fucked up.
  let resolutionStack: ResolutionStack = []

  // For performance reasons, we store
  // the rolled-up registrations when starting a resolve.
  let computedRegistrations: RegistrationHash | null = null

  // Internal registration store for this container.
  const registrations: RegistrationHash = {}

  /**
   * The `Proxy` that is passed to functions so they can resolve their dependencies without
   * knowing where they come from. I call it the "cradle" because
   * it is where registered things come to life at resolution-time.
   */
  const cradle: { [key: string]: any } = new Proxy(
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
      get: (target, name) => resolve(name as string),

      /**
       * Setting things on the cradle throws an error.
       *
       * @param  {object} target
       * @param  {string} name
       */
      set: (target, name, value) => {
        throw new Error(
          `Attempted setting property "${
            name
          }" on container cradle - this is not allowed.`
        )
      },

      /**
       * Used for `Object.keys`.
       */
      ownKeys() {
        return Array.from(cradle as any)
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

  // The container being exposed.
  const container: AwilixContainer = {
    options,
    cradle: cradle as any,
    inspect,
    cache: {},
    loadModules,
    createScope,
    register: register as any,
    registerValue: makeRegister(asValue, true) as any,
    registerClass: makeRegister(asClass) as any,
    registerFunction: makeRegister(asFunction) as any,
    build,
    resolve,
    [util.inspect.custom]: inspect,
    [ROLL_UP_REGISTRATIONS]: rollUpRegistrations,
    get registrations() {
      return rollUpRegistrations()
    }
  }

  // Track the family tree.
  const familyTree: Array<AwilixContainer> = parentContainer
    ? [container].concat((parentContainer as any)[FAMILY_TREE])
    : [container]

  // Save it so we can access it from a scoped container.
  ;(container as any)[FAMILY_TREE] = familyTree

  // We need a reference to the root container,
  // so we can retrieve and store singletons.
  const rootContainer = last(familyTree)

  return container

  /**
   * Used by util.inspect (which is used by console.log).
   */
  function inspect(depth: number, opts: any): string {
    return `[AwilixContainer (${
      parentContainer ? 'scoped, ' : ''
    }registrations: ${Object.keys(container.registrations).length})]`
  }

  /**
   * Rolls up registrations from the family tree.
   * This is cached until `bustCache` clears it.
   *
   * @param {boolean} bustCache
   * Forces a recomputation.
   *
   * @return {object}
   * The merged registrations object.
   */
  function rollUpRegistrations(bustCache: boolean = false): RegistrationHash {
    if (computedRegistrations && !bustCache) {
      return computedRegistrations
    }

    computedRegistrations = Object.assign(
      {},
      parentContainer &&
        (parentContainer as any)[ROLL_UP_REGISTRATIONS](bustCache),
      registrations
    )

    return computedRegistrations!
  }

  /**
   * Used for providing an iterator to the cradle.
   */
  function* registrationNamesIterator() {
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
  function createScope() {
    return createContainer(options, container)
  }

  /**
   * Adds a registration for a resolver.
   */
  function register(arg1: any, arg2: any): AwilixContainer {
    const obj = nameValueToObject(arg1, arg2)
    const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
    for (const key of keys) {
      const value = obj[key] as Resolver<any>
      registrations[key] = value
    }
    // Invalidates the computed registrations.
    computedRegistrations = null
    return container
  }

  /**
   * Makes a register function.
   *
   * @param {Function} fn
   * The `as*` resolver function to make a register function for.
   *
   * @param {Boolean} verbatimValue
   * The `('name', [value, opts])` is not valid for all register functions.
   * When set to true, treat the value as-is, don't check if its an value-opts-array.
   */
  function makeRegister(
    fn: ((value: any, opts?: ResolverOptions<any>) => Resolver<any>),
    verbatimValue?: boolean
  ) {
    return function registerShortcut(
      name: any,
      value: any,
      opts?: ResolverOptions<any>
    ) {
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
  }

  /**
   * Returned to `util.inspect` when attempting to resolve
   * a custom inspector function on the cradle.
   */
  function inspectCradle() {
    return '[AwilixContainer.cradle]'
  }

  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  function resolve(name: string | symbol, resolveOpts?: ResolveOptions) {
    resolveOpts = resolveOpts || {}
    if (!resolutionStack.length) {
      // Root resolve busts the registration cache.
      rollUpRegistrations(true)
    }

    try {
      // Grab the registration by name.
      const registration = computedRegistrations![name]
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

        if (resolveOpts.allowUnregistered) {
          return undefined
        }

        throw new AwilixResolutionError(name, resolutionStack)
      }

      // Pushes the currently-resolving module name onto the stack
      resolutionStack.push(name)

      // Do the thing
      let cached
      let resolved
      switch (registration.lifetime) {
        case Lifetime.TRANSIENT:
          // Transient lifetime means resolve every time.
          resolved = registration.resolve(container)
          break
        case Lifetime.SINGLETON:
          // Singleton lifetime means cache at all times, regardless of scope.
          cached = rootContainer.cache[name]
          if (cached === undefined) {
            resolved = registration.resolve(container)
            rootContainer.cache[name] = resolved
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
    }
  }

  /**
   * Given a registration, class or function, builds it up and returns it.
   * Does not cache it, this means that any lifetime configured in case of passing
   * a registration will not be used.
   *
   * @param {Resolver|Class|Function} targetOrResolver
   * @param {ResolverOptions} opts
   */
  function build<T>(
    targetOrResolver: Resolver<T> | ClassOrFunctionReturning<T>,
    opts?: ResolverOptions<T>
  ): T {
    if (targetOrResolver && (targetOrResolver as Resolver<T>).resolve) {
      return (targetOrResolver as Resolver<T>).resolve(container)
    }

    const funcName = 'build'
    const paramName = 'targetOrResolver'
    AwilixTypeError.assert(
      targetOrResolver,
      funcName,
      paramName,
      'a registration, function or class',
      targetOrResolver
    )
    AwilixTypeError.assert(
      typeof targetOrResolver === 'function',
      funcName,
      paramName,
      'a function or class',
      targetOrResolver
    )

    const resolver = isClass(targetOrResolver as any)
      ? asClass(targetOrResolver as Constructor<T>, opts)
      : asFunction(targetOrResolver as FunctionReturning<T>, opts)
    return resolver.resolve(container)
  }

  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * Additionally, any modules using the `dependsOn` API
   * will be resolved.
   *
   * @see lib/loadModules.js documentation.
   */
  function loadModules(
    globPatterns: Array<string | GlobWithOptions>,
    opts: LoadModulesOptions
  ) {
    const _loadModulesDeps = {
      require:
        options!.require ||
        function(uri) {
          return require(uri)
        },
      listModules,
      container
    }
    realLoadModules(_loadModulesDeps, globPatterns, opts)
    return container
  }
}
