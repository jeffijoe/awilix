import { Lifetime, LifetimeType } from './lifetime'
import { InjectionMode, InjectionModeType } from './injection-mode'
import { isFunction, uniq } from './utils'
import { parseParameterList, Parameter } from './param-parser'
import { AwilixTypeError } from './errors'
import { AwilixContainer, FunctionReturning, ResolveOptions } from './container'

/**
 * RESOLVER symbol can be used by modules loaded by
 * `loadModules` to configure their lifetime, injection mode, etc.
 */
export const RESOLVER = Symbol('Awilix Resolver Config')

/**
 * Gets passed the container and is expected to return an object
 * whose properties are accessible at construction time for the
 * configured resolver.
 *
 * @type {Function}
 */
export type InjectorFunction = <T extends object>(
  container: AwilixContainer<T>
) => object

/**
 * A resolver object returned by asClass(), asFunction() or asValue().
 */
export interface Resolver<T> extends ResolverOptions<T> {
  resolve<U extends object>(container: AwilixContainer<U>): T
}

/**
 * A resolver object created by asClass() or asFunction().
 */
export interface BuildResolver<T> extends Resolver<T>, BuildResolverOptions<T> {
  injectionMode?: InjectionModeType
  injector?: InjectorFunction
  setLifetime(lifetime: LifetimeType): this
  setInjectionMode(mode: InjectionModeType): this
  singleton(): this
  scoped(): this
  transient(): this
  proxy(): this
  classic(): this
  inject(injector: InjectorFunction): this
}

/**
 * Options for disposable resolvers.
 */
export interface DisposableResolverOptions<T> extends ResolverOptions<T> {
  dispose?: Disposer<T>
}

/**
 * Disposable resolver.
 */
export interface DisposableResolver<T>
  extends Resolver<T>,
    DisposableResolverOptions<T> {
  disposer(dispose: Disposer<T>): this
}

/**
 * Disposer function type.
 */
export type Disposer<T> = (value: T) => any | Promise<any>

/**
 * The options when registering a class, function or value.
 * @type RegistrationOptions
 */
export interface ResolverOptions<T> {
  /**
   * Only used for inline configuration with `loadModules`.
   */
  name?: string
  /**
   * Lifetime setting.
   */
  lifetime?: LifetimeType
  /**
   * Registration function to use. Only used for inline configuration with `loadModules`.
   */
  register?: (...args: any[]) => Resolver<T>
}

/**
 * Builder resolver options.
 */
export interface BuildResolverOptions<T>
  extends ResolverOptions<T>,
    DisposableResolverOptions<T> {
  /**
   * Resolution mode.
   */
  injectionMode?: InjectionModeType
  /**
   * Injector function to provide additional parameters.
   */
  injector?: InjectorFunction
}

/**
 * A class constructor. For example:
 *
 *    class MyClass {}
 *
 *    container.registerClass('myClass', MyClass)
 *                                       ^^^^^^^
 */
export type Constructor<T> = { new (...args: any[]): T }

/**
 * Creates a simple value resolver where the given value will always be resolved.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {*} value
 * The value to resolve.
 *
 * @return {object}
 * The resolver.
 */
export function asValue<T>(value: T): Resolver<T> {
  return {
    resolve: () => value
  }
}

/**
 * Creates a factory resolver, where the given factory function
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
 * The resolver.
 */
export function asFunction<T>(
  fn: FunctionReturning<T>,
  opts?: BuildResolverOptions<T>
): BuildResolver<T> & DisposableResolver<T> {
  if (!isFunction(fn)) {
    throw new AwilixTypeError('asFunction', 'fn', 'function', fn)
  }

  const defaults = {
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts, (fn as any)[RESOLVER])

  const resolve = generateResolve(fn)
  let result = {
    resolve,
    ...opts
  }

  return createDisposableResolver(createBuildResolver(result))
}

/**
 * Like a factory resolver, but for classes that require `new`.
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
 * The resolver.
 */
export function asClass<T = {}>(
  Type: Constructor<T>,
  opts?: BuildResolverOptions<T>
): BuildResolver<T> & DisposableResolver<T> {
  if (!isFunction(Type)) {
    throw new AwilixTypeError('asClass', 'Type', 'class', Type)
  }

  const defaults = {
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts, (Type as any)[RESOLVER])

  // A function to handle object construction for us, as to make the generateResolve more reusable
  const newClass = function newClass() {
    return Reflect.construct(Type, arguments)
  }

  const resolve = generateResolve(newClass, Type)
  return createDisposableResolver(
    createBuildResolver({
      ...opts,
      resolve
    })
  )
}

/**
 * Resolves to the specified registration.
 */
export function aliasTo<T>(name: string): Resolver<T> {
  return {
    resolve(container) {
      return container.resolve(name)
    }
  }
}

/**
 * Given an options object, creates a fluid interface
 * to manage it.
 *
 * @param {*} obj
 * The object to return.
 *
 * @return {object}
 * The interface.
 */
export function createBuildResolver<T, B extends Resolver<T>>(
  obj: B
): BuildResolver<T> & B {
  function setLifetime(this: any, value: LifetimeType) {
    return createBuildResolver({
      ...this,
      lifetime: value
    })
  }

  function setInjectionMode(this: any, value: InjectionModeType) {
    return createBuildResolver({
      ...this,
      injectionMode: value
    })
  }

  function inject(this: any, injector: InjectorFunction) {
    return createBuildResolver({
      ...this,
      injector
    })
  }

  return updateResolver(obj, {
    setLifetime,
    inject,
    transient: partial(setLifetime, Lifetime.TRANSIENT),
    scoped: partial(setLifetime, Lifetime.SCOPED),
    singleton: partial(setLifetime, Lifetime.SINGLETON),
    setInjectionMode,
    proxy: partial(setInjectionMode, InjectionMode.PROXY),
    classic: partial(setInjectionMode, InjectionMode.CLASSIC)
  })
}

/**
 * Given a resolver, returns an object with methods to manage the disposer
 * function.
 * @param obj
 */
export function createDisposableResolver<T, B extends Resolver<T>>(
  obj: B
): DisposableResolver<T> & B {
  function disposer(this: any, dispose: Disposer<T>) {
    return createDisposableResolver({
      ...this,
      dispose
    })
  }

  return updateResolver(obj, {
    disposer
  })
}

/**
 * Partially apply arguments to the given function.
 */
function partial<T1, R>(fn: (arg1: T1) => R, arg1: T1): () => R {
  return function partiallyApplied(this: any): R {
    return fn.call(this, arg1)
  }
}

/**
 * Makes an options object based on defaults.
 *
 * @param  {object} defaults
 * Default options.
 *
 * @param  {...} rest
 * The input to check and possibly assign to the resulting object
 *
 * @return {object}
 */
function makeOptions<T, O>(defaults: T, ...rest: Array<O | undefined>): T & O {
  return Object.assign({}, defaults, ...rest) as T & O
}

/**
 * Creates a new resolver with props merged from both.
 *
 * @param source
 * @param target
 */
function updateResolver<T, A extends Resolver<T>, B>(
  source: A,
  target: B
): Resolver<T> & A & B {
  const result = {
    ...(source as any),
    ...(target as any)
  }
  return result
}

/**
 * Returns a wrapped `resolve` function that provides values
 * from the injector and defers to `container.resolve`.
 *
 * @param  {AwilixContainer} container
 * @param  {Object} locals
 * @return {Function}
 */
function wrapWithLocals<T extends object>(
  container: AwilixContainer<T>,
  locals: any
) {
  return function wrappedResolve(name: string, resolveOpts: ResolveOptions) {
    if (name in locals) {
      return locals[name]
    }

    return container.resolve(name, resolveOpts)
  }
}

/**
 * Returns a new Proxy that checks the result from `injector`
 * for values before delegating to the actual container.
 *
 * @param  {Object} cradle
 * @param  {Function} injector
 * @return {Proxy}
 */
function createInjectorProxy<T extends object>(
  container: AwilixContainer<T>,
  injector: InjectorFunction
) {
  const locals = injector(container) as any
  const allKeys = uniq([
    ...Reflect.ownKeys(container.cradle),
    ...Reflect.ownKeys(locals)
  ])
  // TODO: Lots of duplication here from the container proxy.
  // Need to refactor.
  const proxy = new Proxy(
    {},
    {
      /**
       * Resolves the value by first checking the locals, then the container.
       */
      get(target: any, name: string | symbol) {
        if (name === Symbol.iterator) {
          return function* iterateRegistrationsAndLocals() {
            for (const prop in container.cradle) {
              yield prop
            }
            for (const prop in locals) {
              yield prop
            }
          }
        }
        if (name in locals) {
          return locals[name]
        }
        return container.resolve(name as string)
      },

      /**
       * Used for `Object.keys`.
       */
      ownKeys() {
        return allKeys
      },

      /**
       * Used for `Object.keys`.
       */
      getOwnPropertyDescriptor(target: any, key: string) {
        if (allKeys.indexOf(key) > -1) {
          return {
            enumerable: true,
            configurable: true
          }
        }

        return undefined
      }
    }
  )

  return proxy
}

/**
 * Returns a resolve function used to construct the dependency graph
 *
 * @this {Registration}
 * The `this` context is a resolver.
 *
 * @param {Function} fn
 * The function to construct
 *
 * @param {Function} dependencyParseTarget
 * The function to parse for the dependencies of the construction target
 *
 * @param {boolean} isFunction
 * Is the resolution target an actual function or a mask for a constructor?
 *
 * @return {Function}
 * The function used for dependency resolution
 */
function generateResolve(fn: Function, dependencyParseTarget?: Function) {
  // If the function used for dependency parsing is falsy, use the supplied function
  if (!dependencyParseTarget) {
    dependencyParseTarget = fn
  }

  // Parse out the dependencies
  // NOTE: we do this regardless of whether PROXY is used or not,
  // because if this fails, we want it to fail early (at startup) rather
  // than at resolution time.
  const dependencies = parseDependencies(dependencyParseTarget)

  // Use a regular function instead of an arrow function to facilitate binding to the resolver.
  return function resolve<T extends object>(
    this: BuildResolver<any>,
    container: AwilixContainer<T>
  ) {
    // Because the container holds a global reolutionMode we need to determine it in the proper order of precedence:
    // resolver -> container -> default value
    const injectionMode =
      this.injectionMode ||
      container.options.injectionMode ||
      InjectionMode.PROXY

    if (injectionMode !== InjectionMode.CLASSIC) {
      // If we have a custom injector, we need to wrap the cradle.
      const cradle = this.injector
        ? createInjectorProxy(container, this.injector)
        : container.cradle

      // Return the target injected with the cradle
      return fn(cradle)
    }

    // We have dependencies so we need to resolve them manually
    if (dependencies.length > 0) {
      const resolve = this.injector
        ? wrapWithLocals(container, this.injector(container))
        : container.resolve

      const children = dependencies.map(p =>
        resolve(p.name, { allowUnregistered: p.optional })
      )
      return fn(...children)
    }

    return fn()
  }
}

/**
 * Parses the dependencies from the given function.
 * If it's a class and has an extends clause, and no reported dependencies, attempt to parse it's super constructor.
 */
function parseDependencies(fn: Function): Array<Parameter> {
  const result = parseParameterList(fn.toString())
  if (result.length > 0) {
    return result
  }

  const parent = Object.getPrototypeOf(fn)
  if (typeof parent === 'function' && parent !== Function.prototype) {
    // Try to parse the parent
    return parseDependencies(parent)
  }

  return result
}
