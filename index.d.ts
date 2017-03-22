// Type definitions for Awilix v2.2.3
// Project: https://github.com/jeffijoe/awilix
// Definitions by: Brian Love <https://github.com/blove/>

/**
 * The container returned from createContainer has some methods and properties.
 * @interface AwilixContainer
 */
export declare interface AwilixContainer {
  cradle: { [key: string]: any }
  createScope(): AwilixContainer
  loadModules(globPatterns: string[], options?: LoadModulesOptions): Module[]
  registrations: Registration[]
  register(name: string, registration: Registration): AwilixContainer
  register(nameAndRegistrationPair: NameAndRegistrationPair): AwilixContainer
  registerClass<T>(name: string, instance: Object): AwilixContainer
  registerClass<T>(nameAndClassPair: RegisterNameAndClassPair<T>): AwilixContainer
  registerClass<T>(nameAndArrayClassPair: RegisterNameAndArrayClassPair<T>): AwilixContainer
  registerFunction(name: string, fn: Function): AwilixContainer
  registerFunction(nameAndFunctionPair: RegisterNameAndFunctionPair)
  registerFunction(nameAndArrayPair: RegisterNameAndArrayFunctionPair): AwilixContainer
  registerValue(name: string, value: any): AwilixContainer
  registerValue(nameAndValuePairs: RegisterNameAndValuePair): AwilixContainer
  resolve<T>(name: string): T
}

/**
 * This is a special error thrown when Awilix is unable to resolve all dependencies
 * (due to missing or cyclic dependencies).
 * You can catch this error and use err instanceof AwilixResolutionError if you wish.
 * It will tell you what dependencies it could not find or which ones caused a cycle.
 * @class AwilixResolutionError
 * @extends Error
 */
export declare class AwilixResolutionError extends Error {
  //left blank intentionally
}

/**
 * Creates a factory registration for classes that require `new`.
 * @param {T} type
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asClass<T>(type: T, options?: RegistrationOptions): FluidRegistration

/**
 * Creates a factory registration where the given factory function
 * will be invoked with `new` when requested.
 * @param {Function} fn
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asFunction(fn: Function, options?: RegistrationOptions): FluidRegistration

/**
 * Creates a simple value registration where the given value will always be resolved.
 * @param {any} value
 * @param {RegistrationOptions} options
 * @return {Registration}
 */
export declare function asValue(value: any, options?: RegistrationOptions): Registration

/**
 * The options for the createContainer function.
 * @interface ContainerOptions
 */
export interface ContainerOptions {
  require?: (id: string) => any
}

/**
 * Creates an Awilix container instance.
 * @param {ContainerOptions} options
 * @return {AwilixContainer}
 */
export declare function createContainer(options?: ContainerOptions): AwilixContainer

/**
 * A registration object created by asClass() or asFunction().
 * @interface FluidRegistration
 */
export interface FluidRegistration extends Registration {
  singleton(): this
  scoped(): this
  transient(): this
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
export declare function listModules(globPatterns: string | string[], options?: ListModulesOptions): Module[]

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
  formatName?: Function | NameFormatters
  registrationOptions?: RegistrationOptions
}

/**
 * An object containing the module name and path (full path to module).
 * @interface Module
 */
export interface Module {
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
 * @type NameFormatters
 */
export type NameFormatters = 'camelCase'

/**
 * Register a class using the [value, options] array syntax.
 * @interface RegisterNameAndArrayClassPair<T>
 */
export interface RegisterNameAndArrayClassPair<T> {
  [key: string]: [T, RegistrationOptions]
}

/**
 * Register a function using the [value, options] array syntax.
 * @interface RegisterNameAndArrayFunctionPair
 */
export interface RegisterNameAndArrayFunctionPair {
  [key: string]: [Function, RegistrationOptions]
}

/**
 * Register a class.
 * @interface RegisterNameAndClassPair
 */
export interface RegisterNameAndClassPair<T> {
  [key: string]: T
}

/**
 * Register a function.
 * @interface RegisterNameAndFunctionPair
 */
export interface RegisterNameAndFunctionPair {
  [key: string]: Function
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
}

/**
 * The options when registering a class, function or value.
 * @interface RegistrationOptions
 */
export interface RegistrationOptions {
  lifetime?: Lifetime
}