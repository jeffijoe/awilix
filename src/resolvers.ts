import { Lifetime, LifetimeType } from './lifetime'
import { InjectionMode, InjectionModeType } from './injection-mode'
import { isFunction, uniq } from './utils'
import { parseParameterList } from './param-parser'
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
export type InjectorFunction = (container: AwilixContainer) => object

/**
 * A resolver object returned by asClass(), asFunction() or asValue().
 */
export interface Resolver<T> {
  lifetime: LifetimeType
  resolve(container: AwilixContainer): T
}

/**
 * Setter function helpers for build resolvers.
 */
export interface BuildSetters {
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
 * A resolver object created by asClass() or asFunction().
 */
export interface BuildResolver<T> extends Resolver<T>, BuildSetters {
  injectionMode?: InjectionModeType
  injector?: InjectorFunction
}

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
   * Resolution mode.
   */
  injectionMode?: InjectionModeType
  /**
   * Injector function to provide additional parameters.
   */
  injector?: InjectorFunction
  /**
   * Registration function to use.
   */
  resolver?: (...args: any[]) => Resolver<T>
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
export function makeFluidInterface<T>(obj: Resolver<T>): BuildSetters {
  // For TS.
  const buildRegistration = obj as BuildResolver<T>

  function setLifetime(value: LifetimeType) {
    buildRegistration.lifetime = value
    return buildRegistration
  }

  function setInjectionMode(value: InjectionModeType) {
    buildRegistration.injectionMode = value
    return buildRegistration
  }

  function inject(injector: InjectorFunction) {
    buildRegistration.injector = injector
    return buildRegistration
  }

  return {
    setLifetime,
    inject,
    transient: () => setLifetime(Lifetime.TRANSIENT),
    scoped: () => setLifetime(Lifetime.SCOPED),
    singleton: () => setLifetime(Lifetime.SINGLETON),
    setInjectionMode,
    proxy: () => setInjectionMode(InjectionMode.PROXY),
    classic: () => setInjectionMode(InjectionMode.CLASSIC)
  }
}

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
  const resolve = () => {
    return value
  }

  return {
    resolve,
    lifetime: Lifetime.TRANSIENT
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
  opts?: ResolverOptions<T>
): BuildResolver<T> {
  if (!isFunction(fn)) {
    throw new AwilixTypeError('asFunction', 'fn', 'function', fn)
  }

  const defaults = {
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts, (fn as any)[RESOLVER])

  const resolve = generateResolve(fn)
  const result = {
    resolve,
    lifetime: opts.lifetime!,
    injector: opts.injector,
    injectionMode: opts.injectionMode
  }
  result.resolve = resolve.bind(result)
  return Object.assign(result, makeFluidInterface<T>(result))
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
  opts?: ResolverOptions<T>
): BuildResolver<T> {
  if (!isFunction(Type)) {
    throw new AwilixTypeError('asClass', 'Type', 'class', Type)
  }

  const defaults = {
    lifetime: Lifetime.TRANSIENT
  }

  opts = makeOptions(defaults, opts, (Type as any)[RESOLVER])

  // A function to handle object construction for us, as to make the generateResolve more reusable
  const newClass = function newClass() {
    return new Type(...(arguments as any))
  }

  const resolve = generateResolve(newClass, Type.prototype.constructor)
  const result = {
    lifetime: opts.lifetime!,
    injector: opts.injector,
    injectionMode: opts.injectionMode,
    resolve: resolve
  }

  result.resolve = resolve.bind(result)
  return Object.assign(result, makeFluidInterface<T>(result))
}

/**
 * Resolves to the specified registration.
 */
export function aliasTo<T>(name: string): Resolver<T> {
  return {
    // Transient because it all depends on the
    // dependency being resolved.
    lifetime: Lifetime.TRANSIENT,
    resolve(container) {
      return container.resolve(name)
    }
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
 * Returns a wrapped `resolve` function that provides values
 * from the injector and defers to `container.resolve`.
 *
 * @param  {AwilixContainer} container
 * @param  {Object} locals
 * @return {Function}
 */
function wrapWithLocals(container: AwilixContainer, locals: any) {
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
function createInjectorProxy(
  container: AwilixContainer,
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

  // Try to resolve the dependencies
  const dependencies = parseParameterList(dependencyParseTarget.toString())

  // Use a regular function instead of an arrow function to facilitate binding to the resolver.
  return function resolve(
    this: BuildResolver<any>,
    container: AwilixContainer
  ) {
    // Because the container holds a global reolutionMode we need to determine it in the proper order or precedence:
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
