/**
 * Resolution mode type.
 */
export type ResolutionModeType = 'PROXY' | 'CLASSIC'

/**
 * Resolution modes.
 */
export const ResolutionMode: Record<ResolutionModeType, ResolutionModeType> = {
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
