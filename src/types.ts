import { Resolver } from './resolvers'

export interface ResolverInternal<T> extends Resolver<T> {
  /**
   * True if this resolver is a value resolver. Used to implicit set the lifetime of a value
   * resolver to either {@link Lifetime.SCOPED} or {@link Lifetime.SINGLETON} depending on whether
   * this value is registered to a root or a scope container.
   */
  isValue?: boolean

  /**
   * True if this resolver should be excluded from lifetime leak checking. Used to exclude alias
   * resolvers since any lifetime issues will be caught in the resolution of the alias target.
   */
  isLeakSafe?: boolean
}
