import { createContainer } from '../../lib/container'
import { asClass, asFunction } from '../../lib/resolvers'
import { InjectionMode } from '../../lib/injection-mode'

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
      /Could not resolve 'value'/
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
      /Could not resolve 'value'/
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
      /Could not resolve 'value'/
    )
  })
})
