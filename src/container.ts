import * as util from 'util'
import { GlobWithOptions, listModules } from './list-modules'
import {
  LoadModulesOptions,
  loadModules as realLoadModules
} from './load-modules'
import {
  Resolver,
  Constructor,
  asClass,
  asFunction,
  DisposableResolver,
  BuildResolverOptions
} from './resolvers'
import { last, nameValueToObject, isClass } from './utils'
import { InjectionMode, InjectionModeType } from './injection-mode'
import { Lifetime } from './lifetime'
import { AwilixResolutionError, AwilixTypeError } from './errors'

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
  readonly cradle: any
  /**
   * Getter for the rolled up registrations that merges the container family tree.
   */
  readonly registrations: RegistrationHash
  /**
   * Resolved modules cache.
   */
  readonly cache: Map<string | symbol, CacheEntry>
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
   * Checks if the registration with the given name exists.
   *
   * @param {string | symbol} name
   * The name of the registration to resolve.
   *
   * @return {boolean}
   * Whether or not the registration exists.
   */
  has(name: string | symbol): boolean
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
    opts?: BuildResolverOptions<T>
  ): T
  /**
   * Disposes this container and it's children, calling the disposer
   * on all disposable registrations and clearing the cache.
   * Only applies to registrations with `SCOPED` or `SINGLETON` lifetime.
   */
  dispose(): Promise<void>
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
 * Cache entry.
 */
export interface CacheEntry {
  /**
   * The resolver that resolved the value.
   */
  resolver: Resolver<any>
  /**
   * The resolved value.
   */
  value: any
}

/**
 * Register a Registration
 * @interface NameAndRegistrationPair
 */
export interface NameAndRegistrationPair {
  [key: string]: Resolver<any>
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
export type RegistrationHash = Record<string | symbol | number, Resolver<any>>

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
  options = {
    injectionMode: InjectionMode.PROXY,
    ...options
  }

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
      set: (_target, name, value) => {
        throw new Error(
          `Attempted setting property "${name as any}" on container cradle - this is not allowed.`
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
  const container = {
    options,
    cradle: cradle as any,
    inspect,
    cache: new Map<string | symbol, CacheEntry>(),
    loadModules,
    createScope,
    register: register as any,
    build,
    resolve,
    has,
    dispose,
    [util.inspect.custom]: inspect,
    // tslint:disable-next-line
    [ROLL_UP_REGISTRATIONS!]: rollUpRegistrations,
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

    computedRegistrations = {
      ...(parentContainer &&
        (parentContainer as any)[ROLL_UP_REGISTRATIONS](bustCache)),
      ...registrations
    }

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
  function createScope(): AwilixContainer {
    return createContainer(options, container)
  }

  /**
   * Adds a registration for a resolver.
   */
  function register(arg1: any, arg2: any): AwilixContainer {
    const obj = nameValueToObject(arg1, arg2)
    const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]

    for (const key of keys) {
      const value = obj[key as any] as Resolver<any>
      registrations[key as any] = value
    }

    // Invalidates the computed registrations.
    computedRegistrations = null
    return container
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
   * @param {string | symbol} name
   * The name of the registration to resolve.
   *
   * @param {ResolveOptions} resolveOpts
   * The resolve options.
   *
   * @return {any}
   * Whatever was resolved.
   */
  function resolve(name: string | symbol, resolveOpts?: ResolveOptions): any {
    resolveOpts = resolveOpts || {}
    if (!resolutionStack.length) {
      // Root resolve busts the registration cache.
      rollUpRegistrations(true)
    }

    try {
      // Grab the registration by name.
      const resolver = computedRegistrations![name as any]
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

      if (!resolver) {
        // The following checks ensure that console.log on the cradle does not
        // throw an error (issue #7).
        if (name === util.inspect.custom || name === 'inspect') {
          return inspectCradle
        }

        // Edge case: Promise unwrapping will look for a "then" property and attempt to call it.
        // Return undefined so that we won't cause a resolution error. (issue #109)
        if (name === 'then') {
          return undefined
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
      let cached: CacheEntry | undefined
      let resolved
      switch (resolver.lifetime || Lifetime.TRANSIENT) {
        case Lifetime.TRANSIENT:
          // Transient lifetime means resolve every time.
          resolved = resolver.resolve(container)
          break
        case Lifetime.SINGLETON:
          // Singleton lifetime means cache at all times, regardless of scope.
          cached = rootContainer.cache.get(name)
          if (!cached) {
            resolved = resolver.resolve(container)
            rootContainer.cache.set(name, { resolver, value: resolved })
          } else {
            resolved = cached.value
          }
          break
        case Lifetime.SCOPED:
          // Scoped lifetime means that the container
          // that resolves the registration also caches it.
          // When a registration is not found, we travel up
          // the family tree until we find one that is cached.

          cached = container.cache.get(name)
          if (cached !== undefined) {
            // We found one!
            resolved = cached.value
            break
          }

          // If we still have not found one, we need to resolve and cache it.
          resolved = resolver.resolve(container)
          container.cache.set(name, { resolver, value: resolved })
          break
        default:
          throw new AwilixResolutionError(
            name,
            resolutionStack,
            `Unknown lifetime "${resolver.lifetime}"`
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
   * Checks if the registration with the given name exists.
   *
   * @param {string | symbol} name
   * The name of the registration to resolve.
   *
   * @return {boolean}
   * Whether or not the registration exists.
   */
  function has(name: string | symbol): boolean {
    return name in rollUpRegistrations()
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
    opts?: BuildResolverOptions<T>
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

  /**
   * Disposes this container and it's children, calling the disposer
   * on all disposable registrations and clearing the cache.
   */
  function dispose(): Promise<void> {
    const entries = Array.from(container.cache.entries())
    container.cache.clear()
    return Promise.all(
      entries.map(([name, entry]) => {
        const { resolver, value } = entry
        const disposable = resolver as DisposableResolver<any>
        if (disposable.dispose) {
          return Promise.resolve().then(() => disposable.dispose!(value))
        }
        return Promise.resolve()
      })
    ).then(() => undefined)
  }
}
