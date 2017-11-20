/**
 * Injection mode type.
 */
export type InjectionModeType = 'PROXY' | 'CLASSIC'

/**
 * Resolution modes.
 */
export const InjectionMode: Record<InjectionModeType, InjectionModeType> = {
  /**
   * The dependencies will be resolved by injecting the cradle proxy.
   *
   * @type {String}
   */
  PROXY: 'PROXY',
  /**
   * The dependencies will be resolved by inspecting parameter names of the function/constructor.
   *
   * @type {String}
   */
  CLASSIC: 'CLASSIC'
}
