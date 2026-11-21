import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as awilix from '../awilix.ts'
import { createContainer } from '../container.ts'
import { listModules } from '../list-modules.ts'
import { AwilixResolutionError } from '../errors.ts'
import { asValue, asClass, asFunction, aliasTo } from '../resolvers.ts'

describe('awilix', () => {
  it('exists', () => {
    assert.notStrictEqual(awilix, undefined)
  })

  it('has a createContainer function', () => {
    assert.ok('createContainer' in awilix)
    assert.strictEqual(awilix.createContainer, createContainer)
  })

  it('has a listModules function', () => {
    assert.ok('listModules' in awilix)
    assert.strictEqual(awilix.listModules, listModules)
  })

  it('has an AwilixResolutionError function', () => {
    assert.ok('AwilixResolutionError' in awilix)
    assert.strictEqual(awilix.AwilixResolutionError, AwilixResolutionError)
  })

  it('has the asValue, asClass, asFunction and aliasTo functions', () => {
    assert.strictEqual(awilix.asValue, asValue)
    assert.strictEqual(awilix.asClass, asClass)
    assert.strictEqual(awilix.asFunction, asFunction)
    assert.strictEqual(awilix.aliasTo, aliasTo)
  })
})
