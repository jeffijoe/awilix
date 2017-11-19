const { throws } = require('smid')
const { asValue, asFunction, asClass } = require('../registrations')
const createContainer = require('../createContainer')
const Lifetime = require('../Lifetime')
const ResolutionMode = require('../ResolutionMode')
const AwilixNotAFunctionError = require('../AwilixNotAFunctionError')

const testFn = () => 1337
const depsFn = testClass => testClass
const multiDeps = (testClass, needsCradle) => {
  return { testClass, needsCradle }
}

class TestClass {}
class WithDeps {
  constructor(testClass) {
    this.testClass = testClass
  }
}
class NeedsCradle {
  constructor(cradle) {
    this.testClass = cradle.testClass
  }
}
class MultipleDeps {
  constructor(testClass, needsCradle) {
    this.testClass = testClass
    this.needsCradle = needsCradle
  }
}

describe('registrations', function() {
  let container
  beforeEach(function() {
    container = createContainer()
  })

  describe('asValue', function() {
    it('creates a registration with a resolve method', function() {
      expect(typeof asValue(42).resolve).toBe('function')
    })
  })

  describe('asFunction', function() {
    it('creates a registration with a resolve method', function() {
      expect(typeof asFunction(testFn).resolve).toBe('function')
    })

    it('defaults to transient', function() {
      const testSpy = jest.fn(testFn)
      const reg = asFunction(() => testSpy())
      reg.resolve(container)
      reg.resolve(container)

      expect(testSpy).toHaveBeenCalledTimes(2)
    })

    it('manually resolves function dependencies', function() {
      container.register({
        testClass: asClass(TestClass).classic()
      })
      const reg = asFunction(depsFn).classic()
      const result = reg.resolve(container)
      expect(typeof reg.resolve).toBe('function')
      expect(result).toBeInstanceOf(TestClass)
    })

    it('manually resolves multiple function dependencies', function() {
      container.register({
        testClass: asClass(TestClass, {
          resolutionMode: ResolutionMode.CLASSIC
        }),
        needsCradle: asClass(NeedsCradle).proxy()
      })
      const reg = asFunction(multiDeps, {
        resolutionMode: ResolutionMode.CLASSIC
      })
      const result = reg.resolve(container)
      expect(typeof reg.resolve).toBe('function')
      expect(result.testClass).toBeInstanceOf(TestClass)
      expect(result.needsCradle).toBeInstanceOf(NeedsCradle)
    })

    it('supports arrow functions', function() {
      const arrowWithParen = dep => dep
      const arrowWithoutParen = dep => dep
      container.register({
        withParen: asFunction(arrowWithParen).classic(),
        withoutParen: asFunction(arrowWithoutParen).classic(),
        dep: asValue(42)
      })

      expect(container.resolve('withParen')).toBe(42)
      expect(container.resolve('withoutParen')).toBe(42)
    })

    it('throws AwilixNotAFunctionError when given null', function() {
      const err = throws(() => asFunction(null))
      expect(err).toBeInstanceOf(AwilixNotAFunctionError)
    })
  })

  describe('asClass', function() {
    it('creates a registration with a resolve method', function() {
      expect(typeof asClass(TestClass).resolve).toBe('function')
    })

    it('resolves the class by newing it up', function() {
      const reg = asClass(TestClass)
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(TestClass)
    })

    it('resolves dependencies manually', function() {
      container.registerClass({
        testClass: TestClass
      })
      const withDepsReg = asClass(WithDeps).classic()
      const result = withDepsReg.resolve(container)
      expect(result).toBeInstanceOf(WithDeps)
      expect(result.testClass).toBeInstanceOf(TestClass)
    })

    it('resolves single dependency as cradle', function() {
      container.registerClass({
        testClass: TestClass
      })
      const reg = asClass(NeedsCradle).proxy()
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(NeedsCradle)
      expect(result.testClass).toBeInstanceOf(TestClass)
    })

    it('resolves multiple dependencies manually', function() {
      container.registerClass({
        testClass: TestClass,
        needsCradle: NeedsCradle
      })
      const reg = asClass(MultipleDeps, {
        resolutionMode: ResolutionMode.CLASSIC
      })
      const result = reg.resolve(container)
      expect(result).toBeInstanceOf(MultipleDeps)
      expect(result.testClass).toBeInstanceOf(TestClass)
      expect(result.needsCradle).toBeInstanceOf(NeedsCradle)
    })

    it('throws an Error when given null', function() {
      const err = throws(() => asClass(null))
      expect(err).toBeInstanceOf(AwilixNotAFunctionError)
    })
  })

  describe('asClass and asFunction fluid interface', function() {
    it('supports all lifetimes and returns the object itself', function() {
      const subjects = [asClass(TestClass), asFunction(() => {})]

      subjects.forEach(x => {
        let retVal = x.setLifetime(Lifetime.SCOPED)
        expect(retVal).toBe(x)
        expect(retVal.lifetime).toBe(Lifetime.SCOPED)

        retVal = retVal.transient()
        expect(retVal).toBe(x)
        expect(retVal.lifetime).toBe(Lifetime.TRANSIENT)

        retVal = retVal.singleton()
        expect(retVal).toBe(x)
        expect(retVal.lifetime).toBe(Lifetime.SINGLETON)

        retVal = retVal.scoped()
        expect(retVal).toBe(x)
        expect(retVal.lifetime).toBe(Lifetime.SCOPED)
      })
    })

    it('supports inject()', function() {
      const subjects = [asClass(TestClass), asFunction(() => {})]

      subjects.forEach(x => {
        const retVal = x.inject(() => ({ value: 42 }))
        expect(retVal).toBe(x)
      })
    })
  })
})
