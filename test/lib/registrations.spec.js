const { asValue, asFunction, asClass } = require('../../lib/registrations')
const createContainer = require('../../lib/createContainer')
const Lifetime = require('../../lib/Lifetime')
const ResolutionMode = require('../../lib/ResolutionMode')
const AwilixNotAFunctionError = require('../../lib/AwilixNotAFunctionError')
const { catchError } = require('../helpers/errorHelpers')

const testFn = () => 1337
const depsFn = (testClass) => testClass
const multiDeps = (testClass, needsCradle) => {
  return { testClass, needsCradle }
}

class TestClass {}
class WithDeps {
  constructor (testClass) {
    this.testClass = testClass
  }
}
class NeedsCradle {
  constructor (cradle) {
    this.testClass = cradle.testClass
  }
}
class MultipleDeps {
  constructor (testClass, needsCradle) {
    this.testClass = testClass
    this.needsCradle = needsCradle
  }
}

describe('registrations', function () {
  let container
  beforeEach(function () {
    container = createContainer()
  })

  describe('asValue', function () {
    it('creates a registration with a resolve method', function () {
      asValue(42).resolve.should.be.a('function')
    })
  })

  describe('asFunction', function () {
    it('creates a registration with a resolve method', function () {
      asFunction(testFn).resolve.should.be.a('function')
    })

    it('defaults to transient', function () {
      const testSpy = sinon.spy(testFn)
      const reg = asFunction(() => testSpy())
      reg.resolve(container)
      reg.resolve(container)

      testSpy.should.have.been.calledTwice
    })

    it('manually resolves function dependencies', function () {
      container.register({
        testClass: asClass(TestClass).classic()
      })
      const reg = asFunction(depsFn).classic()
      const result = reg.resolve(container)
      reg.resolve.should.be.a('function')
      result.should.be.an.instanceOf(TestClass)
    })

    it('manually resolves multiple function dependencies', function () {
      container.register({
        testClass: asClass(TestClass, { resolutionMode: ResolutionMode.CLASSIC }),
        needsCradle: asClass(NeedsCradle).proxy()
      })
      const reg = asFunction(multiDeps, { resolutionMode: ResolutionMode.CLASSIC })
      const result = reg.resolve(container)
      reg.resolve.should.be.a('function')
      result.testClass.should.be.an.instanceOf(TestClass)
      result.needsCradle.should.be.an.instanceOf(NeedsCradle)
    })

    it('supports arrow functions', function () {
      const arrowWithParen = (dep) => dep
      const arrowWithoutParen = dep => dep
      container.register({
        withParen: asFunction(arrowWithParen).classic(),
        withoutParen: asFunction(arrowWithoutParen).classic(),
        dep: asValue(42)
      })

      expect(container.resolve('withParen')).to.equal(42)
      expect(container.resolve('withoutParen')).to.equal(42)
    })

    it('throws AwilixNotAFunctionError when given null', function () {
      const err = catchError(() => asFunction(null))
      err.should.be.an.instanceof(AwilixNotAFunctionError)
    })
  })

  describe('asClass', function () {
    it('creates a registration with a resolve method', function () {
      asClass(TestClass).resolve.should.be.a('function')
    })

    it('resolves the class by newing it up', function () {
      const reg = asClass(TestClass)
      const result = reg.resolve(container)
      result.should.be.an.instanceOf(TestClass)
    })

    it('resolves dependencies manually', function () {
      container.registerClass({
        testClass: TestClass
      })
      const withDepsReg = asClass(WithDeps).classic()
      const result = withDepsReg.resolve(container)
      result.should.be.an.instanceOf(WithDeps)
      result.testClass.should.be.an.instanceOf(TestClass)
    })

    it('resolves single dependency as cradle', function () {
      container.registerClass({
        testClass: TestClass
      })
      const reg = asClass(NeedsCradle).proxy()
      const result = reg.resolve(container)
      result.should.be.an.instanceOf(NeedsCradle)
      result.testClass.should.be.an.instanceOf(TestClass)
    })

    it('resolves multiple dependencies manually', function () {
      container.registerClass({
        testClass: TestClass,
        needsCradle: NeedsCradle
      })
      const reg = asClass(MultipleDeps, { resolutionMode: ResolutionMode.CLASSIC })
      const result = reg.resolve(container)
      result.should.be.an.instanceOf(MultipleDeps)
      result.testClass.should.be.an.instanceOf(TestClass)
      result.needsCradle.should.be.an.instanceOf(NeedsCradle)
    })

    it('throws an Error when given null', function () {
      const err = catchError(() => asClass(null))
      err.should.be.an.instanceof(AwilixNotAFunctionError)
    })
  })

  describe('asClass and asFunction fluid interface', function () {
    it('supports all lifetimes and returns the object itself', function () {
      const subjects = [
        asClass(TestClass),
        asFunction(() => {})
      ]

      subjects.forEach(x => {
        let retVal = x.setLifetime(Lifetime.SCOPED)
        retVal.should.equal(x)
        retVal.lifetime.should.equal(Lifetime.SCOPED)

        retVal = retVal.transient()
        retVal.should.equal(x)
        retVal.lifetime.should.equal(Lifetime.TRANSIENT)

        retVal = retVal.singleton()
        retVal.should.equal(x)
        retVal.lifetime.should.equal(Lifetime.SINGLETON)

        retVal = retVal.scoped()
        retVal.should.equal(x)
        retVal.lifetime.should.equal(Lifetime.SCOPED)
      })
    })

    it('supports inject()', function () {
      const subjects = [
        asClass(TestClass),
        asFunction(() => {})
      ]

      subjects.forEach(x => {
        const retVal = x.inject(() => ({ value: 42 }))
        expect(retVal).to.equal(x)
      })
    })
  })
})
