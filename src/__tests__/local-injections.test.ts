import { createContainer } from '../container'
import { asClass } from '../registrations'
import { ResolutionMode } from '../resolution-mode'

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

describe('local injections', function() {
  it('invokes the injector and provides the result to the constructor', function() {
    const container = createContainer().register({
      test: asClass(Test).inject(injector),
      testClassic: asClass(TestClassic)
        .inject(injector)
        .classic(),
      test2: asClass(Test)
    })

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test).toBeInstanceOf(Test)
    expect(container.cradle.testClassic.value).toBe(42)

    expect(() => container.cradle.test2.value).toThrowError(
      /Could not resolve 'value'/
    )
  })

  it('supported by registerClass', function() {
    const container = createContainer().registerClass({
      test: [Test, { injector }],
      testClassic: [
        TestClassic,
        { injector, resolutionMode: ResolutionMode.CLASSIC }
      ],
      test2: Test
    })

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test).toBeInstanceOf(Test)
    expect(container.cradle.testClassic.value).toBe(42)
    expect(() => container.cradle.test2.value).toThrowError(
      /Could not resolve 'value'/
    )
  })

  it('supported by registerFunction', function() {
    const container = createContainer().registerFunction({
      test: [makeTest, { injector }],
      testClassic: [
        makeCLassicTest,
        { injector, resolutionMode: ResolutionMode.CLASSIC }
      ],
      test2: makeTest
    })

    expect(container.cradle.test.value).toBe(42)

    expect(container.cradle.testClassic.test.isTest).toBe(true)
    expect(container.cradle.testClassic.value).toBe(42)
    expect(() => container.cradle.test2.value).toThrowError(
      /Could not resolve 'value'/
    )
  })
})
