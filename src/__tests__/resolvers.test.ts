import { throws } from 'smid'
import { asValue, asFunction, asClass } from '../resolvers'
import type { AwilixContainer } from '../container'
import { createContainer } from '../container'
import { Lifetime } from '../lifetime'
import { InjectionMode } from '../injection-mode'
import { AwilixTypeError } from '../errors'
import { aliasTo } from '../awilix'

const testFn = () => 1337
const depsFn = (testClass: any) => testClass
const multiDeps = (testClass: any, needsCradle: any) => {
  return { testClass, needsCradle }
}

class TestClass {
  dispose() {
    /**/
  }
}
class WithDeps {
  testClass: any
  constructor(testClass: any) {
    this.testClass = testClass
  }
}
class NeedsCradle {
  testClass: any
  constructor(cradle: any) {
    this.testClass = cradle.testClass
  }
}
class MultipleDeps {
  testClass: any
  needsCradle: any
  constructor(testClass: any, needsCradle: any) {
    this.testClass = testClass
    this.needsCradle = needsCradle
  }
}

describe('registrations', () => {
  let container: AwilixContainer
  beforeEach(function () {
    container = createContainer()
  })

  describe('asValue', () => {
    it('creates a registration with a resolve method', () => {
      expect(typeof asValue(42).resolve).toBe('function')
    })
  })

  describe('asFunction', () => {
    it('creates a registration with a resolve method', () => {
      expect(typeof asFunction(testFn).resolve).toBe('function')
    })

    it('defaults to transient', () => {
      const testSpy = jest.fn(testFn)
      const reg = asFunction(() => testSpy())
      reg.resolve(container)
      reg.resolve(container)

      expect(testSpy).toHaveBeenCalledTimes(2)
    })

    it('manually resolves function dependencies', () => {
      container.register({
        testClass: asClass(TestClass).classic(),
      })
      const reg = asFunction(depsFn).classic()
      const result = reg.resolve(container)
      expect(typeof reg.resolve).toBe('function')
      expect(result).toBeInstanceOf(TestClass)
    })

    it('manually resolves multiple function dependencies', () => {
      container.register({
        testClass: asClass(TestClass, {
          injectionMode: InjectionMode.CLASSIC,
        }),
        needsCradle: asClass(NeedsCradle).proxy(),
      })
      const reg = asFunction(multiDeps, {
        injectionMode: InjectionMode.CLASSIC,
      })
      const result = reg.resolve(container)
      expect(typeof reg.resolve).toBe('function')
      expect(result.testClass).toBeInstanceOf(TestClass)
      expect(result.needsCradle).toBeInstanceOf(NeedsCradle)
    })

    it('supports arrow functions', () => {
      const arrowWithParen = (dep: any) => dep
      const arrowWithoutParen: (arg: any) => any = (dep) => dep
      container.register({
        withParen: asFunction(arrowWithParen).classic(),
        withoutParen: asFunction(arrowWithoutParen).classic(),
        dep: asValue(42),
      })

      expect(container.resolve('withParen')).toBe(42)
      expect(container.resolve('withoutParen')).toBe(42)
    })

    it('throws AwilixTypeError when given null', () => {
      const err = throws(() => asFunction(null as any))
      expect(err).toBeInstanceOf(AwilixTypeError)
    })
  })

  describe('asClass', () => {
    it('creates a registration with a resolve method', () => {
      expect(typeof asClass(TestClass).resolve).toBe('function')
    })

    it('resolves the class by newing it up', () => {
      const reg = asClass(TestClass)
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(TestClass)
    })

    it('resolves dependencies manually', () => {
      container.register({
        testClass: asClass(TestClass),
      })
      const withDepsReg = asClass(WithDeps).classic()
      const result = withDepsReg.resolve(container)
      expect(result).toBeInstanceOf(WithDeps)
      expect(result.testClass).toBeInstanceOf(TestClass)
    })

    it('resolves single dependency as cradle', () => {
      container.register({
        testClass: asClass(TestClass),
      })
      const reg = asClass(NeedsCradle).proxy()
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(NeedsCradle)
      expect(result.testClass).toBeInstanceOf(TestClass)
    })

    it('resolves multiple dependencies manually', () => {
      container.register({
        testClass: asClass(TestClass),
        needsCradle: asClass(NeedsCradle),
      })
      const reg = asClass(MultipleDeps, {
        injectionMode: InjectionMode.CLASSIC,
      })
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(MultipleDeps)
      expect(result.testClass).toBeInstanceOf(TestClass)
      expect(result.needsCradle).toBeInstanceOf(NeedsCradle)
    })

    it('throws an Error when given null', () => {
      const err = throws(() => asClass(null!))
      expect(err).toBeInstanceOf(AwilixTypeError)
    })
  })

  describe('asClass and asFunction fluid interface', () => {
    it('supports all lifetimes and returns the object itself', () => {
      const subjects = [
        asClass<TestClass>(TestClass),
        asFunction(() => {
          return new TestClass()
        }),
      ]

      subjects.forEach((x) => {
        let retVal = x.setLifetime(Lifetime.SCOPED)
        expect(retVal.lifetime).toBe(Lifetime.SCOPED)

        retVal = retVal.transient()
        expect(retVal.lifetime).toBe(Lifetime.TRANSIENT)

        retVal = retVal.singleton()
        expect(retVal.lifetime).toBe(Lifetime.SINGLETON)

        retVal = retVal.scoped()
        expect(retVal.lifetime).toBe(Lifetime.SCOPED)

        const d = (t: TestClass) => {
          return t.dispose()
        }
        retVal = retVal.disposer(d)
        expect(retVal.dispose).toBe(d)
      })
    })

    it('supports inject()', () => {
      const subjects = [
        asClass(TestClass),
        asFunction(() => {
          /**/
        }),
      ]

      subjects.forEach((x) => {
        const retVal = x.inject(() => ({ value: 42 }))
        expect(retVal.injector).toBeDefined()
      })
    })
  })

  describe('aliasTo', () => {
    it('returns the string aliased dependency', () => {
      container.register({ val: asValue(123), aliasVal: aliasTo('val') })
      expect(container.resolve('aliasVal')).toBe(123)
    })

    it('returns the symbol aliased dependency', () => {
      const symbol = Symbol()
      container.register({ [symbol]: asValue(123), aliasVal: aliasTo(symbol) })
      expect(container.resolve('aliasVal')).toBe(123)
    })
  })
})
