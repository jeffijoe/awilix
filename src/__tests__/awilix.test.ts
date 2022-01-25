import * as awilix from '../../lib/awilix'
import { createContainer } from '../../lib/container'
import { listModules } from '../../lib/list-modules'
import { AwilixResolutionError } from '../../lib/errors'
import { asValue, asClass, asFunction, aliasTo } from '../../lib/resolvers'

describe('awilix', () => {
  it('exists', () => {
    expect(awilix).toBeDefined()
  })

  it('has a createContainer function', () => {
    expect(awilix).toHaveProperty('createContainer')
    expect(awilix.createContainer).toBe(createContainer)
  })

  it('has a listModules function', () => {
    expect(awilix).toHaveProperty('listModules')
    expect(awilix.listModules).toBe(listModules)
  })

  it('has an AwilixResolutionError function', () => {
    expect(awilix).toHaveProperty('AwilixResolutionError')
    expect(awilix.AwilixResolutionError).toBe(AwilixResolutionError)
  })

  it('has the asValue, asClass, asFunction and aliasTo functions', () => {
    expect(awilix.asValue).toBe(asValue)
    expect(awilix.asClass).toBe(asClass)
    expect(awilix.asFunction).toBe(asFunction)
    expect(awilix.aliasTo).toBe(aliasTo)
  })
})
