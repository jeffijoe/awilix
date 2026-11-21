import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createContainer as _createContainer } from '../container.ts'

// Runtime behavior tests — use `any` cradle.
const createContainer = (...args: Parameters<typeof _createContainer>) =>
  _createContainer<any>(...args)
import { asClass, asFunction, asValue } from '../resolvers.ts'
import { InjectionMode } from '../injection-mode.ts'

class Test {
  value: any
  constructor({ value }: any) {
    this.value = value
  }
}

class TestClassic {
  test: any
  value: any
  constructor(test: any, value: any) {
    this.test = test
    this.value = value
  }
}

const makeTest = ({ value }: any) => ({ value, isTest: true })
const makeCLassicTest = (test: any, value: any) => ({ value, test })

const injector = () => ({ value: 42 })

describe('local injections', () => {
  it('invokes the injector and provides the result to the constructor', () => {
    const container = createContainer().register({
      test: asClass(Test).inject(injector),
      testClassic: asClass(TestClassic).inject(injector).classic(),
      test2: asClass(Test),
    })

    assert.strictEqual(container.cradle.test.value, 42)

    assert.ok(container.cradle.testClassic.test instanceof Test)
    assert.strictEqual(container.cradle.testClassic.value, 42)

    assert.throws(
      () => container.cradle.test2.value,
      /Could not resolve 'value'/,
    )
  })

  it('supported by registerClass', () => {
    const container = createContainer().register({
      test: asClass(Test, { injector }),
      testClassic: asClass(TestClassic, {
        injector,
        injectionMode: InjectionMode.CLASSIC,
      }),
      test2: asClass(Test),
    })

    assert.strictEqual(container.cradle.test.value, 42)

    assert.ok(container.cradle.testClassic.test instanceof Test)
    assert.strictEqual(container.cradle.testClassic.value, 42)
    assert.throws(
      () => container.cradle.test2.value,
      /Could not resolve 'value'/,
    )
  })

  it('supported by registerFunction', () => {
    const container = createContainer().register({
      test: asFunction(makeTest, { injector }),
      testClassic: asFunction(makeCLassicTest, {
        injector,
        injectionMode: InjectionMode.CLASSIC,
      }),
      test2: asFunction(makeTest),
    })

    assert.strictEqual(container.cradle.test.value, 42)

    assert.strictEqual(container.cradle.testClassic.test.isTest, true)
    assert.strictEqual(container.cradle.testClassic.value, 42)
    assert.throws(
      () => container.cradle.test2.value,
      /Could not resolve 'value'/,
    )
  })

  describe('injector proxy keys', () => {
    it('injector local overrides container registration', () => {
      const container = createContainer().register({
        val: asValue('from-container'),
        consumer: asFunction((cradle: any) => cradle.val).inject(() => ({
          val: 'from-injector',
        })),
      })

      assert.strictEqual(container.resolve('consumer'), 'from-injector')
    })

    it('supports symbol keys in both container registrations and injector locals', () => {
      const symContainer = Symbol('containerSym')
      const symLocal = Symbol('localSym')
      const symShared = Symbol('sharedSym')

      const container = createContainer()
        .register({
          [symContainer]: asValue('from-container'),
          [symShared]: asValue('original'),
        })
        .register({
          consumer: asFunction((cradle: any) => ({
            containerSym: cradle[symContainer],
            localSym: cradle[symLocal],
            sharedSym: cradle[symShared],
          })).inject(() => ({
            [symLocal]: 'from-local',
            [symShared]: 'overridden',
          })),
        })

      const result = container.resolve<any>('consumer')
      // Symbol registered on the container is accessible
      assert.strictEqual(result.containerSym, 'from-container')
      // Symbol from the injector locals is accessible
      assert.strictEqual(result.localSym, 'from-local')
      // Injector local overrides container registration for symbols
      assert.strictEqual(result.sharedSym, 'overridden')
    })
  })
})
