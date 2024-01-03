import { LifetimeType } from './lifetime'

export type ResolutionStack = Array<{
  name: string | symbol
  lifetime: LifetimeType
}>
