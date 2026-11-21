import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import { Lifetime } from '../lifetime.ts'

const require = createRequire(import.meta.url)
const AnotherService =
  require('./fixture/services/anotherService.js').AnotherService
const fixture = require('./fixture/index.js')

describe('integration tests', () => {
  it('bootstraps everything so the answer can be resolved', () => {
    const container = fixture()
    const anotherService = container.resolve('anotherService')
    assert.ok(anotherService instanceof AnotherService)
    assert.strictEqual(typeof anotherService.repo, 'object')
    assert.strictEqual(typeof anotherService.repo.getAnswerFor, 'function')
    assert.strictEqual(Object.keys(container.registrations).length, 4)
  })

  it('registered all services as scoped', () => {
    const container = fixture()
    const scope1 = container.createScope()
    const scope2 = container.createScope()

    assert.strictEqual(
      container.registrations.mainService.lifetime,
      Lifetime.SCOPED,
    )
    assert.strictEqual(
      container.registrations.anotherService.lifetime,
      Lifetime.SCOPED,
    )
    assert.strictEqual(
      container.registrations.answerRepository.lifetime,
      Lifetime.TRANSIENT,
    )

    assert.strictEqual(
      scope1.resolve('mainService'),
      scope1.resolve('mainService'),
    )
    assert.notStrictEqual(
      scope1.resolve('mainService'),
      scope2.resolve('mainService'),
    )

    assert.strictEqual(
      scope1.resolve('anotherService'),
      scope1.resolve('anotherService'),
    )
    assert.notStrictEqual(
      scope1.resolve('anotherService'),
      scope2.resolve('anotherService'),
    )
  })
})
