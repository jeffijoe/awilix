const { asValue, asFunction, asClass } = require('../../lib/registrations')
const createContainer = require('../../lib/createContainer')
const Lifetime = require('../../lib/Lifetime')

const testFn = () => 1337
const depsFn = (testClass) => testClass

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

describe('registrations', function () {
  let container
  beforeEach(function () {
    container = createContainer()
  })

  describe('asValue', function () {
    it('creates a registration with a resolve method', function () {
      asValue(42).resolve.should.be.a.function
    })
  })

  describe('asFunction', function () {
    it('creates a registration with a resolve method', function () {
      asFunction(testFn).resolve.should.be.a.function
    })

    it('defaults to transient', function () {
      const testSpy = sinon.spy(testFn)
      const reg = asFunction(() => testSpy())
      reg.resolve(container)
      reg.resolve(container)

      testSpy.should.have.been.calledTwice
    })

    it('manually resolves function dependencies', function() {
      container.registerClass({
        testClass: TestClass
      })
      const reg = asFunction(depsFn)
      const result = reg.resolve(container)
      reg.resolve.should.be.a.function
      result.should.be.an.instanceOf(TestClass)
    })
  })

  describe('asClass', function () {
    it('creates a registration with a resolve method', function () {
      asClass(TestClass).resolve.should.be.a.function
    })

    it('resolves the class by newing it up', function () {
      const reg = asClass(TestClass)
      const result = reg.resolve(container)
      result.should.be.an.instanceOf(TestClass)
    })

    it('resolves dependencies manually', function() {
      container.registerClass({
        testClass: TestClass
      })
      const withDepsReg = asClass(WithDeps)
      const result = withDepsReg.resolve(container)
      result.should.be.an.instanceOf(WithDeps)
      result.testClass.should.be.an.instanceOf(TestClass)
    })
    it('resolves single dependency as cradle', function() {
      container.registerClass({
        testClass: TestClass
      })
      const reg = asClass(NeedsCradle)
      const result = reg.resolve(container)
      result.should.be.an.instanceOf(NeedsCradle)
      result.testClass.should.be.an.instanceOf(TestClass)
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
  })
})
