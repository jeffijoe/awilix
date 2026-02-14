import { createContainer as _createContainer } from '../container'

// Runtime behavior tests — use `any` cradle.
const createContainer = (...args: Parameters<typeof _createContainer>) =>
  _createContainer<any>(...args)
import { asClass, asFunction, asValue } from '../resolvers'
import { InjectionMode } from '../injection-mode'

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

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test).toBeInstanceOf(Test)
    expect(container.cradle.testClassic.value).toBe(42)

    expect(() => container.cradle.test2.value).toThrowError(
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

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test).toBeInstanceOf(Test)
    expect(container.cradle.testClassic.value).toBe(42)
    expect(() => container.cradle.test2.value).toThrowError(
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

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test.isTest).toBe(true)
    expect(container.cradle.testClassic.value).toBe(42)
    expect(() => container.cradle.test2.value).toThrowError(
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

      expect(container.resolve('consumer')).toBe('from-injector')
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
      expect(result.containerSym).toBe('from-container')
      // Symbol from the injector locals is accessible
      expect(result.localSym).toBe('from-local')
      // Injector local overrides container registration for symbols
      expect(result.sharedSym).toBe('overridden')
    })
  })
})
