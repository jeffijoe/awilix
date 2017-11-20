import * as awilix from '../awilix'
import { createContainer } from '../container'
import { listModules } from '../list-modules'
import { AwilixResolutionError } from '../errors'
import { asValue, asClass, asFunction } from '../resolvers'

describe('awilix', function() {
  it('exists', function() {
    expect(awilix).toBeDefined()
  })

  it('has a createContainer function', function() {
    expect(awilix).toHaveProperty('createContainer')
    expect(awilix.createContainer).toBe(createContainer)
  })

  it('has a listModules function', function() {
    expect(awilix).toHaveProperty('listModules')
    expect(awilix.listModules).toBe(listModules)
  })

  it('has an AwilixResolutionError function', function() {
    expect(awilix).toHaveProperty('AwilixResolutionError')
    expect(awilix.AwilixResolutionError).toBe(AwilixResolutionError)
  })

  it('has the asValue, asClass and asFunction functions', function() {
    expect(awilix.asValue).toBe(asValue)
    expect(awilix.asClass).toBe(asClass)
    expect(awilix.asFunction).toBe(asFunction)
  })
})
