import * as util from 'util'
import {
  AwilixError,
  AwilixRegistrationError,
  AwilixResolutionError,
  AwilixTypeError,
} from './errors.ts'
import { type InjectionModeType, InjectionMode } from './injection-mode.ts'
import { type LifetimeType, Lifetime, isLifetimeLonger } from './lifetime.ts'
import { type GlobWithOptions, listModules } from './list-modules.ts'
import { importModule } from './load-module-native.ts'
import {
  type LoadModulesOptions,
  type LoadModulesResult,
  loadModules as realLoadModules,
} from './load-modules.ts'
import {
  type BuildResolverOptions,
  type Constructor,
  type DisposableResolver,
  type Resolver,
  asClass,
  asFunction,
} from './resolvers.ts'
import { isClass, last, nameValueToObject } from './utils.ts'
import { DisposalMode, type DisposalModeType } from './disposal-mode.ts'

/**
 * The container returned from createContainer has some methods and properties.
 * @interface AwilixContainer
 */
export interface AwilixContainer<Cradle extends object = {}> {
  /**
   * Options the container was configured with.
   */
  options: ContainerOptions
  /**
   * The proxy injected when using `PROXY` injection mode.
   * Can be used as-is.
   */
  readonly cradle: Cradle
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
  createScope<T extends object = object>(): AwilixContainer<Cradle & T>
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
  loadModules<ESM extends boolean = false>(
    globPatterns: Array<string | GlobWithOptions>,
    options?: LoadModulesOptions<ESM>,
  ): ESM extends false ? this : Promise<this>

  /**
   * Adds a single registration that using a pre-constructed resolver.
   */
  register<N extends string | symbol, T>(
    name: N,
    registration: Resolver<T>,
  ): AwilixContainer<Cradle & Record<N, T>>
  /**
   * Pairs resolvers to registration names and registers them.
   * Mutates and returns the same container, but with an expanded type
   * that includes the newly registered types, enabling incremental
   * type building via chaining.
   */
  register<R extends Record<string, Resolver<any>>>(
    nameAndRegistrationPair: R,
  ): AwilixContainer<Cradle & InferCradleFromResolvers<R>>
  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  resolve<K extends keyof Cradle>(
    this: void,
    name: K,
    resolveOptions?: ResolveOptions,
  ): Cradle[K]
  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  resolve<T>(
    this: void,
    name: string | symbol,
    resolveOptions?: ResolveOptions,
  ): T
  /**
   * Checks if the registration with the given name exists.
   *
   * @param {string | symbol} name
   * The name of the registration to resolve.
   *
   * @return {boolean}
   * Whether or not the registration exists.
   */
  hasRegistration(name: string | symbol): boolean
  /**
   * Recursively gets a registration by name if it exists in the
   * current container or any of its' parents.
   *
   * @param name {string | symbol} The registration name.
   */
  getRegistration<K extends keyof Cradle>(name: K): Resolver<Cradle[K]> | null
  /**
   * Recursively gets a registration by name if it exists in the
   * current container or any of its' parents.
   *
   * @param name {string | symbol} The registration name.
   */
  getRegistration<T = unknown>(name: string | symbol): Resolver<T> | null
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
    opts?: BuildResolverOptions<T>,
  ): T
  /**
   * Disposes this container and it's children, calling the disposer
   * on all disposable registrations and clearing the cache.
   * Only applies to registrations with `SCOPED` or `SINGLETON` lifetime.
   *
   * @param {DisposeOptions} options
   */
  dispose(options?: DisposeOptions): Promise<void>
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
 * Optional options for disposing a container.
 */
export interface DisposeOptions {
  /**
   * How to invoke disposers of cached dependencies.
   *
   * @default 'CONCURRENT'
   */
  mode?: DisposalModeType
}

/**
 * Cache entry.
 */
export interface CacheEntry<T = any> {
  /**
   * The resolver that resolved the value.
   */
  resolver: Resolver<T>
  /**
   * The resolved value.
   */
  value: T
}

/**
 * Register a Registration
 * @interface NameAndRegistrationPair
 */
export type NameAndRegistrationPair<T> = {
  [U in keyof T]?: Resolver<T[U]>
}

/**
 * Extracts the resolved type from a Resolver.
 */
export type InferResolverType<T> = T extends Resolver<infer U> ? U : never

/**
 * Extracts the Cradle type from an AwilixContainer type.
 *
 * @example
 * const container = createContainer()
 *   .register({
 *     userService: asClass(UserService),
 *     logger: asValue(new Logger()),
 *   })
 * type MyCradle = InferCradleFromContainer<typeof container>
 * // => { userService: UserService; logger: Logger }
 */
export type InferCradleFromContainer<T extends AwilixContainer<any>> =
  T extends AwilixContainer<infer C> ? C : never

/**
 * Given an object whose values are Resolvers, produces the corresponding
 * cradle type by extracting the resolved type from each resolver.
 *
 * @example
 * const resolvers = {
 *   userService: asClass(UserService),
 *   logger: asValue(new Logger()),
 * }
 * type MyCradle = InferCradleFromResolvers<typeof resolvers>
 * // => { userService: UserService; logger: Logger }
 */
export type InferCradleFromResolvers<T extends Record<string, Resolver<any>>> =
  {
    [K in keyof T]: InferResolverType<T[K]>
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
 */
export interface ContainerOptions {
  require?: (id: string) => any
  injectionMode?: InjectionModeType
  strict?: boolean
}

/**
 * Contains a hash of registrations where the name is the key.
 */
export type RegistrationHash = Record<string | symbol | number, Resolver<any>>

export type ResolutionStack = Array<{
  name: string | symbol
  lifetime: LifetimeType
}>

/**
 * Family tree symbol.
 */
const FAMILY_TREE = Symbol('familyTree')

/**
 * Roll Up Registrations symbol.
 */
const ROLL_UP_REGISTRATIONS = Symbol('rollUpRegistrations')

/**
 * The string representation when calling toString.
 */
const CRADLE_STRING_TAG = 'AwilixContainerCradle'

/**
 * Creates an Awilix container instance.
 *
 * @param {Function} options.require The require function to use. Defaults to require.
 *
 * @param {string} options.injectionMode The mode used by the container to resolve dependencies.
 * Defaults to 'Proxy'.
 *
 * @param {boolean} options.strict True if the container should run in strict mode with additional
 * validation for resolver configuration correctness. Defaults to false.
 *
 * @return {AwilixContainer<T>} The container.
 */
export function createContainer<T extends object = {}>(
  options: ContainerOptions = {},
): AwilixContainer<T> {
  return createContainerInternal(options)
}

/**
 * Tracks container disposal state.
 */
interface DisposalState {
  disposing: boolean
  disposed: boolean
}

function createContainerInternal<T extends object = {}, U extends object = {}>(
  options: ContainerOptions,
  parentContainer?: AwilixContainer<U>,
  parentResolutionStack?: ResolutionStack,
  parentRootDisposalState?: DisposalState,
): AwilixContainer<T> {
  options = {
    injectionMode: InjectionMode.PROXY,
    strict: false,
    ...options,
  }

  /**
   * Tracks the names and lifetimes of the modules being resolved. Used to detect circular
   * dependencies and, in strict mode, lifetime leakage issues.
   */
  const resolutionStack: ResolutionStack = parentResolutionStack ?? []

  // Internal registration store for this container.
  // No prototype, so names like `toString` or `constructor` are not
  // mistaken for registrations.
  const registrations: RegistrationHash = Object.create(null)

  // Track container disposal state so we can reject resolution during and after disposal.
  const disposalState: DisposalState = { disposing: false, disposed: false }

  // Scopes own their cache, but all singletons belong to the root container.
  const rootDisposalState = parentRootDisposalState ?? disposalState

  /**
   * The `Proxy` that is passed to functions so they can resolve their dependencies without
   * knowing where they come from. I call it the "cradle" because
   * it is where registered things come to life at resolution-time.
   */
  const cradle = new Proxy(
    {
      [util.inspect.custom]: toStringRepresentationFn,
    },
    {
      /**
       * The `get` handler is invoked whenever a get-call for `container.cradle.*` is made.
       *
       * @param  {object} _target
       * The proxy target. Irrelevant.
       *
       * @param  {string} name
       * The property name.
       *
       * @return {*}
       * Whatever the resolve call returns.
       */
      get: (_target: object, name: string): any => resolve(name),

      /**
       * Setting things on the cradle throws an error.
       *
       * @param  {object} target
       * @param  {string} name
       */
      set: (_target, name: string) => {
        throw new Error(
          `Attempted setting property "${
            name as any
          }" on container cradle - this is not allowed.`,
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
            configurable: true,
          }
        }

        return undefined
      },
    },
  ) as T

  // The container being exposed.
  const container = {
    options,
    cradle,
    inspect,
    cache: new Map<string | symbol, CacheEntry>(),
    loadModules,
    createScope,
    register: register as any,
    build,
    resolve,
    hasRegistration,
    dispose,
    getRegistration,
    [util.inspect.custom]: inspect,
    [ROLL_UP_REGISTRATIONS]: rollUpRegistrations,
    get registrations() {
      return rollUpRegistrations()
    },
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
  function inspect(): string {
    return `[AwilixContainer (${
      parentContainer ? 'scoped, ' : ''
    }registrations: ${Object.keys(container.registrations).length})]`
  }

  /**
   * Rolls up registrations from the family tree.
   *
   * This can get pretty expensive. Only used when
   * iterating the cradle proxy, which is not something
   * that should be done in day-to-day use, mostly for debugging.
   *
   * @param {boolean} bustCache
   * Forces a recomputation.
   *
   * @return {object}
   * The merged registrations object.
   */
  function rollUpRegistrations(): RegistrationHash {
    return {
      ...(parentContainer && (parentContainer as any)[ROLL_UP_REGISTRATIONS]()),
      ...registrations,
    }
  }

  /**
   * Used for providing an iterator to the cradle.
   */
  function* cradleIterator() {
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
  function createScope<P extends object>(): AwilixContainer<P & T> {
    return createContainerInternal(
      options,
      container as AwilixContainer<T>,
      resolutionStack,
      rootDisposalState,
    )
  }

  /**
   * Adds a registration for a resolver.
   */
  function register(arg1: any, arg2: any): AwilixContainer<T> {
    const obj = nameValueToObject(arg1, arg2)
    const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]

    for (const key of keys) {
      const resolver = obj[key as any] as Resolver<any>
      // If strict mode is enabled, check to ensure we are not registering a singleton on a non-root
      // container.
      if (options.strict && resolver.lifetime === Lifetime.SINGLETON) {
        if (parentContainer) {
          throw new AwilixRegistrationError(
            key,
            'Cannot register a singleton on a scoped container.',
          )
        }
      }

      registrations[key as any] = resolver
    }

    return container
  }

  /**
   * Returned to `util.inspect` and Symbol.toStringTag when attempting to resolve
   * a custom inspector function on the cradle.
   */
  function toStringRepresentationFn() {
    return Object.prototype.toString.call(cradle)
  }

  /**
   * Recursively gets a registration by name if it exists in the
   * current container or any of its' parents.
   *
   * @param name {string | symbol} The registration name.
   */
  function getRegistration(name: string | symbol) {
    const resolver = registrations[name]
    if (resolver) {
      return resolver
    }

    if (parentContainer) {
      return parentContainer.getRegistration(name)
    }

    return null
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
    if (disposalState.disposed) {
      throw new AwilixResolutionError(
        name,
        resolutionStack,
        'Container has been disposed.',
      )
    }

    resolveOpts = resolveOpts || {}

    try {
      // Grab the registration by name.
      const resolver = getRegistration(name)

      // Cycle detection: scan the resolution stack.
      for (let i = 0; i < resolutionStack.length; i++) {
        if (resolutionStack[i].name === name) {
          throw new AwilixResolutionError(
            name,
            resolutionStack,
            'Cyclic dependencies detected.',
          )
        }
      }

      // Used in JSON.stringify.
      if (name === 'toJSON') {
        return toStringRepresentationFn
      }

      // Used in console.log.
      if (name === 'constructor') {
        return createContainer
      }

      if (!resolver) {
        // Checks for some edge cases.
        switch (name) {
          // The following checks ensure that console.log on the cradle does not
          // throw an error (issue #7).
          case util.inspect.custom:
          case 'inspect':
          case 'toString':
            return toStringRepresentationFn
          case Symbol.toStringTag:
            return CRADLE_STRING_TAG
          // Edge case: Promise unwrapping will look for a "then" property and attempt to call it.
          // Return undefined so that we won't cause a resolution error. (issue #109)
          case 'then':
            return undefined
          // When using `Array.from` or spreading the cradle, this will
          // return the registration names.
          case Symbol.iterator:
            return cradleIterator
        }

        if (resolveOpts.allowUnregistered) {
          return undefined
        }

        throw new AwilixResolutionError(name, resolutionStack)
      }

      const lifetime = resolver.lifetime || Lifetime.TRANSIENT

      // Throws if a shorter-lived dependency is resolved through a longer-lived ancestor.
      function throwIfLifetimeLeakage(
        depName: string | symbol,
        depLifetime: LifetimeType,
        dep: Resolver<any>,
      ) {
        if (!options.strict || dep.isLeakSafe) return
        for (let i = 0; i < resolutionStack.length; i++) {
          if (isLifetimeLonger(resolutionStack[i].lifetime, depLifetime)) {
            throw new AwilixResolutionError(
              depName,
              resolutionStack,
              `Dependency '${depName.toString()}' has a shorter lifetime than its ancestor: '${resolutionStack[i].name.toString()}'`,
            )
          }
        }
      }

      // Fast path: cached singletons can always be returned immediately
      // since nothing has a longer lifetime.
      if (lifetime === Lifetime.SINGLETON) {
        if (rootDisposalState.disposed) {
          throw new AwilixResolutionError(
            name,
            resolutionStack,
            `Cannot resolve new instance of '${name.toString()}' because the root container has been disposed.`,
          )
        }

        const cached = rootContainer.cache.get(name)
        if (cached) {
          return cached.value
        }
      }

      // Fast path: cached scoped values can be returned immediately,
      // but in strict mode we still need to verify lifetime constraints.
      if (lifetime === Lifetime.SCOPED) {
        const cached = container.cache.get(name)
        if (cached !== undefined) {
          throwIfLifetimeLeakage(name, lifetime, resolver)
          return cached.value
        }
      }

      // A new instance would not be in the disposal snapshot and could leak.
      if (
        disposalState.disposing ||
        (lifetime === Lifetime.SINGLETON && rootDisposalState.disposing)
      ) {
        throw new AwilixResolutionError(
          name,
          resolutionStack,
          'Cannot resolve uncached dependencies while disposing.',
        )
      }

      // Slow path: need to invoke the factory.
      throwIfLifetimeLeakage(name, lifetime, resolver)

      resolutionStack.push({ name, lifetime })

      let resolved
      switch (lifetime) {
        case Lifetime.TRANSIENT:
          resolved = resolver.resolve(container)
          break
        case Lifetime.SINGLETON:
          // Cache was already checked above, so this is always a miss.
          resolved = resolver.resolve(
            options.strict ? rootContainer : container,
          )
          rootContainer.cache.set(name, { resolver, value: resolved })
          break
        case Lifetime.SCOPED:
          // Cache was already checked above, so this is always a miss.
          resolved = resolver.resolve(container)
          container.cache.set(name, { resolver, value: resolved })
          break
        default:
          throw new AwilixResolutionError(
            name,
            resolutionStack,
            `Unknown lifetime "${resolver.lifetime}"`,
          )
      }
      resolutionStack.pop()

      return resolved
    } catch (err) {
      // When we get an error we need to reset the stack. Mutate the existing array rather than
      // updating the reference to ensure all parent containers' stacks are also updated.
      resolutionStack.length = 0
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
  function hasRegistration(name: string | symbol): boolean {
    return !!getRegistration(name)
  }

  /**
   * Given a registration, class or function, builds it up and returns it.
   * Does not cache it, this means that any lifetime configured in case of passing
   * a registration will not be used.
   *
   * @param {Resolver|Constructor|Function} targetOrResolver
   * @param {ResolverOptions} opts
   */
  function build<T>(
    targetOrResolver: Resolver<T> | ClassOrFunctionReturning<T>,
    opts?: BuildResolverOptions<T>,
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
      targetOrResolver,
    )
    AwilixTypeError.assert(
      typeof targetOrResolver === 'function',
      funcName,
      paramName,
      'a function or class',
      targetOrResolver,
    )

    const resolver = isClass(targetOrResolver as any)
      ? asClass(targetOrResolver as Constructor<T>, opts)
      : asFunction(targetOrResolver as FunctionReturning<T>, opts)
    return resolver.resolve(container)
  }

  function loadModules<ESM extends boolean = false>(
    globPatterns: Array<string | GlobWithOptions>,
    opts: LoadModulesOptions<ESM>,
  ): ESM extends false ? AwilixContainer<T> : Promise<AwilixContainer<T>>
  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * Additionally, any modules using the `dependsOn` API
   * will be resolved.
   *
   * @see lib/loadModules.js documentation.
   */
  function loadModules<ESM extends boolean = false>(
    globPatterns: Array<string | GlobWithOptions>,
    opts: LoadModulesOptions<ESM>,
  ): Promise<AwilixContainer<T>> | AwilixContainer<T> {
    const _loadModulesDeps = {
      require:
        options.require ||
        function (uri) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require(uri)
        },
      listModules,
      container,
    }
    if (opts?.esModules) {
      _loadModulesDeps.require = importModule
      return (
        realLoadModules(
          _loadModulesDeps,
          globPatterns,
          opts,
        ) as Promise<LoadModulesResult>
      ).then(() => container)
    } else {
      void realLoadModules(_loadModulesDeps, globPatterns, opts)
      return container
    }
  }

  /**
   * Disposes this container and it's children, calling the disposer
   * on all disposable registrations and clearing the cache.
   *
   * @param options
   */
  async function dispose(options?: DisposeOptions): Promise<void> {
    if (disposalState.disposed) {
      return
    }

    if (disposalState.disposing) {
      throw new AwilixError('Container disposal already in progress.')
    }

    // Set `disposalState.disposing` before invoking disposers to reject synchronous re-entrancy too.
    disposalState.disposing = true
    try {
      await disposeEntries(options)
    } finally {
      // Failed cleanup is still terminal; another `dispose()` must not run it again.
      disposalState.disposed = true
      disposalState.disposing = false
    }
  }

  async function disposeEntries(options?: DisposeOptions): Promise<void> {
    const isSerialDisposalRequested = options?.mode === DisposalMode.SERIAL
    const entries = Array.from(container.cache.entries())

    // Reverse the order of the entries so we trigger disposal of the dependent before
    // its' dependencies. For example, if you're injecting a logger into a service, and
    // both the logger and service have a disposer, the service's disposer is called
    // before the logger's disposer.
    entries.reverse()

    // Collected errors from disposers. This gets modified by the `disposeEntry` helper.
    const errors: unknown[] = []

    if (isSerialDisposalRequested) {
      // Disposes dependencies one at a time. In the example above, this would ensure that
      // the service can use the logger in its' disposer, since the logger wouldn't get disposed
      // until after the service does.
      for (const entry of entries) {
        await disposeEntry(entry)
      }
    } else {
      // Disposes dependencies concurrently.
      await Promise.all(entries.map(disposeEntry))
    }

    if (errors.length) {
      throw new AggregateError(errors, 'Failed to dispose dependencies')
    }

    // Disposes an entry if it has a disposer.
    async function disposeEntry([name, { resolver, value }]: [
      string | symbol,
      CacheEntry<unknown>,
    ]) {
      const disposable = resolver as DisposableResolver<any>
      try {
        if (disposable.dispose) {
          return await disposable.dispose(value)
        }
      } catch (error: unknown) {
        errors.push(error)
      } finally {
        // Keep the instance cached until its disposer finishes so cleanup can
        // resolve it through the `cradle` without creating a replacement.
        container.cache.delete(name)
      }
    }
  }
}
