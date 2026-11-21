/**
 * Disposal mode type.
 */
export type DisposalModeType = 'CONCURRENT' | 'SERIAL'

/**
 * Disposal modes.
 */
export const DisposalMode: Record<DisposalModeType, DisposalModeType> = {
  /**
   * The dependencies will be disposed concurrently.
   *
   * This is the fastest mode, but it also means disposers cannot rely on
   * disposable injected dependencies during their own disposal.
   *
   * @type {String}
   */
  CONCURRENT: 'CONCURRENT',

  /**
   * The dependencies will be disposed one at a time.
   *
   * This is slower because it has to wait for each dependency's disposer,
   * but it allows using a dependency inside a disposer (assuming standard resolution order).
   *
   * @type {String}
   */
  SERIAL: 'SERIAL',
}
