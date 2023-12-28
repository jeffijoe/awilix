/**
 * Lifetime type.
 */
export type LifetimeType = 'SINGLETON' | 'TRANSIENT' | 'SCOPED'

/**
 * Lifetime types.
 */
export const Lifetime: Record<LifetimeType, LifetimeType> = {
  /**
   * The registration will be resolved once and only once.
   * @type {String}
   */
  SINGLETON: 'SINGLETON',

  /**
   * The registration will be resolved every time (never cached).
   * @type {String}
   */
  TRANSIENT: 'TRANSIENT',

  /**
   * The registration will be resolved once per scope.
   * @type {String}
   */
  SCOPED: 'SCOPED',
}

export function isLifetimeLonger(a: LifetimeType, b: LifetimeType): boolean {
  return (
    (a === Lifetime.SINGLETON && b !== Lifetime.SINGLETON) ||
    (a === Lifetime.SCOPED && b === Lifetime.TRANSIENT)
  )
}
