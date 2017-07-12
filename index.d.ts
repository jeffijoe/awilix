// Type definitions for Awilix v2.2.6
// Project: https://github.com/jeffijoe/awilix
// Definitions by: Brian Love <https://github.com/blove/>

/**
 * The container returned from createContainer has some methods and properties.
 * @interface AwilixContainer
 */
export declare interface AwilixContainer {
  cradle: { [key: string]: any }
  createScope(): AwilixContainer
  loadModules(globPatterns: string[] | Array<[string, RegistrationOptions]>, options?: LoadModulesOptions): ModuleDescriptor[]
  registrations: Registration[]
  register(name: string, registration: Registration): this
  register(nameAndRegistrationPair: NameAndRegistrationPair): this
  registerClass<T>(name: string, ctor: Constructor<T>, opts?: RegistrationOptions): this
  registerClass<T>(name: string, ctorAndOptionsPair: [Constructor<T>, RegistrationOptions]): this
  registerClass(nameAndClassPair: RegisterNameAndClassPair): this
  registerFunction(name: string, fn: Function, opts?: RegistrationOptions): this
  registerFunction(name: string, funcAndOptionsPair: [Function, RegistrationOptions]): this
  registerFunction(nameAndFunctionPair: RegisterNameAndFunctionPair): this
  registerValue(name: string, value: any): this
  registerValue(nameAndValuePairs: RegisterNameAndValuePair): this
  resolve<T>(name: string): T
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
 * This is a special error thrown when Awilix is unable to resolve all dependencies
 * (due to missing or cyclic dependencies).
 * You can catch this error and use err instanceof AwilixResolutionError if you wish.
 * It will tell you what dependencies it could not find or which ones caused a cycle.
 * @class AwilixResolutionError
 * @extends Error
 */
export declare class AwilixResolutionError extends Error {
}

/**
 * Creates a factory registration for classes that require `new`.
 * @param {T} type
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asClass<T>(
  type: Constructor<T>,
  options?: RegistrationOptions
): FluidRegistration

/**
 * Creates a factory registration where the given factory function
 * will be invoked with `new` when requested.
 * @param {Function} fn
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asFunction(
  fn: Function,
  options?: RegistrationOptions
): FluidRegistration

/**
 * Creates a simple value registration where the given value will always be resolved.
 * @param {any} value
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asValue(
  value: any,
  options?: RegistrationOptions
): Registration

/**
 * The options for the createContainer function.
 * @interface ContainerOptions
 */
export interface ContainerOptions {
  require?: (id: string) => any,
  resolutionMode?: ResolutionMode
}

/**
 * Creates an Awilix container instance.
 * @param {ContainerOptions} options
 * @return {AwilixContainer}
 */
export declare function createContainer(options?: ContainerOptions): AwilixContainer

/**
 * Gets passed the container and is expected to return an object
 * whose properties are accessible at construction time for the
 * configured registration.
 *
 * @type {Function}
 */
export type InjectorFunction = (container: AwilixContainer) => object

/**
 * A registration object created by asClass() or asFunction().
 * @interface FluidRegistration
 */
export interface FluidRegistration extends Registration {
  singleton(): this
  scoped(): this
  transient(): this
  proxy(): this
  classic(): this
  inject(injector: InjectorFunction): this
}

/**
 * Resolution Modes
 * @class ResolutionMode
 */
export declare class ResolutionMode {
  static PROXY: string
  static CLASSIC: string
}

/**
 * Lifetime management.
 * @class Lifetime
 */
export declare class Lifetime {
  static SCOPED: string
  static SINGLETON: string
  static TRANSIENT: string
}

/**
 * Returns a promise for a list of {name, path} pairs,
 * where the name is the module name, and path is the actual
 * full path to the module.
 * @param {string | string[]} globPatterns
 * @param {ListModulesOptions} options
 * @return Module[]
 */
export declare function listModules(
  globPatterns: string | string[] | Array<[string, RegistrationOptions]>,
  options?: ListModulesOptions
): ModuleDescriptor[]

/**
 * The options when invoking listModules().
 * @interface ListModulesOptions
 */
export interface ListModulesOptions {
  cwd?: string
}

/**
 * The options when invoking loadModules().
 * @interface LoadModulesOptions
 */
export interface LoadModulesOptions {
  cwd?: string
  formatName?: NameFormatter | BuiltInNameFormatters
  registrationOptions?: RegistrationOptions
}

/**
 * Takes in the filename of the module being loaded as well as the module descriptor,
 * and returns a string which is used to register the module in the container.
 *
 * `descriptor.name` is the same as `name`.
 *
 * @type {NameFormatter}
 */
export type NameFormatter = (name: string, descriptor: ModuleDescriptor) => string

/**
 * An object containing the module name and path (full path to module).
 *
 * @interface ModuleDescriptor
 */
export interface ModuleDescriptor {
  name: string
  path: string
}

/**
 * Register a Registration
 * @interface NameAndRegistrationPair
 */
export interface NameAndRegistrationPair {
  [key: string]: Registration
}

/**
 * Name formatting options when using loadModules().
 * @type BuiltInNameFormatters
 */
export type BuiltInNameFormatters = 'camelCase'

/**
 * Register a class.
 * @interface RegisterNameAndClassPair
 */
export interface RegisterNameAndClassPair {
  [key: string]: [Constructor<any>, RegistrationOptions] | Constructor<any>
}

/**
 * Register a function.
 * @interface RegisterNameAndFunctionPair
 */
export interface RegisterNameAndFunctionPair {
  [key: string]: [Function, RegistrationOptions] | Function
}

/**
 * Register a value.
 * @interface RegisterNameAndValuePair
 */
export interface RegisterNameAndValuePair {
  [key: string]: any
}

/**
 * A registration object returned by asClass(), asFunction() or asValue().
 */
export interface Registration {
  resolve(): any
  lifetime: Lifetime
  resolutionMode: ResolutionMode
}

/**
 * The options when registering a class, function or value.
 * @interface RegistrationOptions
 */
export interface RegistrationOptions {
  lifetime?: Lifetime
  resolutionMode?: ResolutionMode
  injector?: InjectorFunction
}
