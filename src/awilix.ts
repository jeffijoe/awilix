export {
  type AwilixContainer,
  type ContainerOptions,
  type CacheEntry,
  type ClassOrFunctionReturning,
  type FunctionReturning,
  type InferCradleFromContainer,
  type InferCradleFromResolvers,
  type InferResolverType,
  type NameAndRegistrationPair,
  type RegistrationHash,
  type ResolveOptions,
  type DisposeOptions,
  createContainer,
} from './container.ts'
export {
  AwilixError,
  AwilixRegistrationError,
  AwilixResolutionError,
  AwilixTypeError,
} from './errors.ts'
export { InjectionMode, type InjectionModeType } from './injection-mode.ts'
export { Lifetime, type LifetimeType } from './lifetime.ts'
export { DisposalMode, type DisposalModeType } from './disposal-mode.ts'
export {
  type GlobWithOptions,
  type ListModulesOptions,
  type ModuleDescriptor,
  listModules,
} from './list-modules.ts'
export {
  type BuildResolverOptions,
  type Disposer,
  type InjectorFunction,
  type Resolver,
  type ResolverOptions,
  type BuildResolver,
  type Constructor,
  type DisposableResolver,
  type DisposableResolverOptions,
  RESOLVER,
  aliasTo,
  asClass,
  asFunction,
  asValue,
  createBuildResolver,
  createDisposableResolver,
} from './resolvers.ts'
export { isClass, isFunction } from './utils.ts'
