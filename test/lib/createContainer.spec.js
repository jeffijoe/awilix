const util = require('util')
const createContainer = require('../../lib/createContainer')
const Lifetime = require('../../lib/Lifetime')
const { catchError } = require('../helpers/errorHelpers')
const AwilixResolutionError = require('../../lib/AwilixResolutionError')
const { asClass, asFunction, asValue } = require('../../lib/registrations')
const ResolutionMode = require('../../lib/ResolutionMode')

class Test {
  constructor({ repo }) {
    this.repo = repo
  }

  stuff() {
    return this.repo.getStuff()
  }
}

class Repo {
  getStuff() {
    return 'stuff'
  }
}

class ManualTest {
  constructor(repo) {
    this.repo = repo
  }
}

describe('createContainer', function() {
  it('returns an object', function() {
    const container = createContainer()
    container.should.be.an('object')
  })

  describe('container', function() {
    it('lets me register something and resolve it', function() {
      const container = createContainer()
      container.register({ someValue: asValue(42) })
      container.register({
        test: asFunction(deps => {
          return {
            someValue: deps.someValue
          }
        })
      })

      const test = container.cradle.test
      expect(test).to.be.ok
      test.someValue.should.equal(42)
    })

    it('lets me register something and resolve it via classic resolution mode', function() {
      const container = createContainer({
        resolutionMode: ResolutionMode.CLASSIC
      })
      container.register({
        manual: asClass(ManualTest),
        repo: asClass(Repo)
      })

      const test = container.cradle.manual
      expect(test).to.be.ok
      expect(test.repo).to.be.ok
    })

    describe('register', function() {
      it('supports multiple registrations in a single call', function() {
        const container = createContainer()
        container.register({
          universe: asValue(42),
          leet: asValue(1337)
        })

        container.register({
          service: asFunction(({ func, universe }) => ({
            method: () => func(universe)
          })),
          func: asFunction(() => answer =>
            'Hello world, the answer is ' + answer
          )
        })

        Object.keys(container.registrations).length.should.equal(4)

        container
          .resolve('service')
          .method()
          .should.equal('Hello world, the answer is 42')
      })

      it('supports classes', function() {
        const container = createContainer()
        container.register({
          test: asClass(Test),
          repo: asClass(Repo)
        })

        container
          .resolve('test')
          .stuff()
          .should.equal('stuff')
      })
    })

    describe('register* functions', function() {
      let container
      beforeEach(function() {
        container = createContainer()
      })

      it('supports registerClass', function() {
        container.registerClass('nameValue', Test)
        container.registerClass('nameValueWithOpts', Test, {
          lifetime: Lifetime.SCOPED
        })
        container.registerClass('nameValueWithArray', [
          Test,
          { lifetime: Lifetime.SCOPED }
        ])
        container.registerClass('nameValueWithLifetime', [
          Test,
          Lifetime.SCOPED
        ])
        container.registerClass({
          obj: Test,
          objWithOpts: [Test, { lifetime: Lifetime.SCOPED }],
          objWithLifetime: [Test, Lifetime.SCOPED]
        })

        container.registrations.nameValue.lifetime.should.equal(
          Lifetime.TRANSIENT
        )
        container.registrations.nameValueWithArray.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.nameValueWithOpts.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.nameValueWithLifetime.lifetime.should.equal(
          Lifetime.SCOPED
        )

        container.registrations.obj.lifetime.should.equal(Lifetime.TRANSIENT)
        container.registrations.objWithOpts.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.objWithLifetime.lifetime.should.equal(
          Lifetime.SCOPED
        )
      })

      it('supports registerFunction', function() {
        const fn = () => 42
        container.registerFunction('nameValue', fn)
        container.registerFunction('nameValueWithOpts', fn, {
          lifetime: Lifetime.SCOPED
        })
        container.registerFunction('nameValueWithArray', [
          fn,
          { lifetime: Lifetime.SCOPED }
        ])
        container.registerFunction('nameValueWithLifetime', [
          fn,
          Lifetime.SCOPED
        ])
        container.registerFunction({
          obj: fn,
          objWithOpts: [fn, { lifetime: Lifetime.SCOPED }],
          objWithLifetime: [fn, Lifetime.SCOPED]
        })

        container.registrations.nameValue.lifetime.should.equal(
          Lifetime.TRANSIENT
        )
        container.registrations.nameValueWithArray.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.nameValueWithOpts.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.nameValueWithLifetime.lifetime.should.equal(
          Lifetime.SCOPED
        )

        container.registrations.obj.lifetime.should.equal(Lifetime.TRANSIENT)
        container.registrations.objWithOpts.lifetime.should.equal(
          Lifetime.SCOPED
        )
        container.registrations.objWithLifetime.lifetime.should.equal(
          Lifetime.SCOPED
        )
      })

      it('can infer the registration name in registerFunction and registerClass', function() {
        container.registerFunction(
          function plain() {
            return 1
          },
          { lifetime: Lifetime.SCOPED }
        )

        const arrow = () => 2
        container.registerFunction(arrow)

        container.registerClass(Repo)

        expect(container.resolve('plain')).to.equal(1)
        expect(container.resolve('arrow')).to.equal(2)
        expect(container.resolve('Repo')).to.be.an.instanceOf(Repo)

        expect(container.registrations.plain.lifetime).to.equal(Lifetime.SCOPED)
      })

      it('fails when it cannot read the name of the function', function() {
        expect(() => container.registerFunction(() => 42)).to.throw(/name/)
      })

      it('supports registerValue', function() {
        container.registerValue('nameValue', 1)
        container.registerValue({
          obj: 2,
          another: 3
        })

        container.resolve('nameValue').should.equal(1)
        container.resolve('obj').should.equal(2)
        container.resolve('another').should.equal(3)
      })

      it('does not treat arrays in registerValue as [val, opts]', function() {
        container.registerValue('arr', [1, 2])
        container.resolve('arr').should.deep.equal([1, 2])
      })

      it('supports chaining', function() {
        class Heh {}
        const func = () => {}
        const value = 42

        expect(
          container
            .register('lol', asValue('haha'))
            .registerValue('value', value)
            .registerFunction('function', func)
            .registerClass('class', Heh)
        ).to.equal(container)
      })
    })

    describe('resolve', function() {
      it('resolves the dependency chain and supports all registrations', function() {
        class TestClass {
          constructor({ factory }) {
            this.factoryResult = factory()
          }
        }

        const factorySpy = sinon.spy(cradle => 'factory ' + cradle.value)
        const container = createContainer()
        container.registerValue({ value: 42 })
        container.registerFunction({
          factory: cradle => () => factorySpy(cradle)
        })
        container.registerClass({ theClass: TestClass })

        const root = container.resolve('theClass')
        root.factoryResult.should.equal('factory 42')
      })

      it('throws an AwilixResolutionError when there are unregistered dependencies', function() {
        const container = createContainer()
        const err = catchError(() => container.resolve('nope'))
        err.should.be.an.instanceOf(AwilixResolutionError)
        err.message.should.match(/nope/i)
      })

      it('throws an AwilixResolutionError that supports symbols', function() {
        const container = createContainer()
        const S = Symbol('i am the derg')
        const err = catchError(() => container.resolve(S))
        err.should.be.an.instanceOf(AwilixResolutionError)
        err.message.should.match(/i am the derg/i)
      })

      it('throws an AwilixResolutionError with a resolution path when resolving an unregistered dependency', function() {
        const container = createContainer()
        container.registerFunction({
          first: cradle => cradle.second,
          second: cradle => cradle.third,
          third: cradle => cradle.unregistered
        })

        const err = catchError(() => container.resolve('first'))
        err.message.should.contain('first -> second -> third')
      })

      it('does not screw up the resolution stack when called twice', function() {
        const container = createContainer()
        container.registerFunction({
          first: cradle => cradle.second,
          otherFirst: cradle => cradle.second,
          second: cradle => cradle.third,
          third: cradle => cradle.unregistered
        })

        const err1 = catchError(() => container.resolve('first'))
        const err2 = catchError(() => container.resolve('otherFirst'))
        err1.message.should.contain('first -> second -> third')
        err2.message.should.contain('otherFirst -> second -> third')
      })

      it('supports transient lifetime', function() {
        const container = createContainer()
        let counter = 1
        container.register({
          hehe: asFunction(() => counter++).transient()
        })

        container.cradle.hehe.should.equal(1)
        container.cradle.hehe.should.equal(2)
      })

      it('supports singleton lifetime', function() {
        const container = createContainer()
        let counter = 1
        container.register({
          hehe: asFunction(() => counter++).singleton()
        })

        container.cradle.hehe.should.equal(1)
        container.cradle.hehe.should.equal(1)
      })

      it('supports scoped lifetime', function() {
        const container = createContainer()
        let scopedCounter = 1
        container.register({
          scoped: asFunction(() => scopedCounter++).scoped()
        })

        const scope1 = container.createScope()
        scope1.cradle.scoped.should.equal(1)
        scope1.cradle.scoped.should.equal(1)

        const scope2 = container.createScope()
        scope2.cradle.scoped.should.equal(2)
        scope2.cradle.scoped.should.equal(2)
      })

      it('caches singletons regardless of scope', function() {
        const container = createContainer()
        let singletonCounter = 1
        container.register({
          singleton: asFunction(() => singletonCounter++).singleton()
        })

        const scope1 = container.createScope()
        scope1.cradle.singleton.should.equal(1)
        scope1.cradle.singleton.should.equal(1)

        const scope2 = container.createScope()
        scope2.cradle.singleton.should.equal(1)
        scope2.cradle.singleton.should.equal(1)
      })

      it('resolves transients regardless of scope', function() {
        const container = createContainer()
        let transientCounter = 1
        container.register({
          transient: asFunction(() => transientCounter++).transient()
        })

        const scope1 = container.createScope()
        scope1.cradle.transient.should.equal(1)
        scope1.cradle.transient.should.equal(2)

        const scope2 = container.createScope()
        scope2.cradle.transient.should.equal(3)
        scope2.cradle.transient.should.equal(4)
      })

      it('uses parents cache when scoped', function() {
        const container = createContainer()
        let scopedCounter = 1
        container.register({
          scoped: asFunction(() => scopedCounter++).scoped()
        })

        const scope1 = container.createScope()
        scope1.cradle.scoped.should.equal(1)
        scope1.cradle.scoped.should.equal(1)

        const scope2 = scope1.createScope()
        scope2.cradle.scoped.should.equal(1)
        scope2.cradle.scoped.should.equal(1)

        container.cradle.scoped.should.equal(2)
        container.cradle.scoped.should.equal(2)
        scope2.cradle.scoped.should.equal(1)
      })

      it('supports nested scopes', function() {
        const container = createContainer()

        // Increments the counter every time it is resolved.
        let counter = 1
        container.register({
          counterValue: asFunction(() => counter++).scoped()
        })
        const scope1 = container.createScope()
        const scope2 = container.createScope()

        const scope1Child = scope1.createScope()

        scope1.cradle.counterValue.should.equal(1)
        scope1.cradle.counterValue.should.equal(1)
        scope2.cradle.counterValue.should.equal(2)
        scope2.cradle.counterValue.should.equal(2)
        scope1Child.cradle.counterValue.should.equal(1)
      })

      it('resolves dependencies in scope', function() {
        const container = createContainer()
        // Register a transient function
        // that returns the value of the scope-provided dependency.
        // For this example we could also use scoped lifetime.
        container.register({
          scopedValue: asFunction(cradle => 'Hello ' + cradle.someValue)
        })

        // Create a scope and register a value.
        const scope = container.createScope()
        scope.register({
          someValue: asValue('scope')
        })

        scope.cradle.scopedValue.should.equal('Hello scope')
      })

      it('cannot find a scope-registered value when resolved from root', function() {
        const container = createContainer()
        // Register a transient function
        // that returns the value of the scope-provided dependency.
        // For this example we could also use scoped lifetime.
        container.register({
          scopedValue: asFunction(cradle => 'Hello ' + cradle.someValue)
        })

        // Create a scope and register a value.
        const scope = container.createScope()
        scope.register({
          someValue: asValue('scope')
        })

        expect(() => container.cradle.scopedValue).to.throw(
          AwilixResolutionError
        )
      })

      it('supports overwriting values in a scope', function() {
        const container = createContainer()
        // It does not matter when the scope is created,
        // it will still have anything that is registered
        // in it's parent.
        const scope = container.createScope()

        container.register({
          value: asValue('root'),
          usedValue: asFunction(cradle => cradle.value)
        })

        scope.register({
          value: asValue('scope')
        })

        container.cradle.usedValue.should.equal('root')
        scope.cradle.usedValue.should.equal('scope')
      })

      it('throws an AwilixResolutionError when there are cyclic dependencies', function() {
        const container = createContainer()
        container.registerFunction({
          first: cradle => cradle.second,
          second: cradle => cradle.third,
          third: cradle => cradle.second
        })

        const err = catchError(() => container.resolve('first'))
        err.message.should.contain('first -> second -> third -> second')
      })

      it('throws an AwilixResolutionError when the lifetime is unknown', function() {
        const container = createContainer()
        container.registerFunction({
          first: cradle => cradle.second,
          second: [cradle => 'hah', { lifetime: 'lol' }]
        })

        const err = catchError(() => container.resolve('first'))
        err.message.should.contain('first -> second')
        err.message.should.contain('lol')
      })
    })

    describe('loadModules', function() {
      let container
      beforeEach(function() {
        container = createContainer()
      })

      it('returns the container', function() {
        expect(container.loadModules([])).to.equal(container)
      })
    })

    describe('setting a property on the cradle', function() {
      it('should fail', function() {
        expect(() => {
          createContainer().cradle.lol = 'nope'
        }).to.throw(Error, /lol/)
      })
    })

    describe('using util.inspect on the container', function() {
      it('should return a summary', function() {
        const container = createContainer()
          .registerValue({ val1: 1, val2: 2 })
          .registerFunction({ fn1: () => true })
          .registerClass({ c1: Repo })

        expect(util.inspect(container)).to.equal(
          '[AwilixContainer (registrations: 4)]'
        )
        expect(
          util.inspect(container.createScope().registerValue({ val3: 3 }))
        ).to.equal('[AwilixContainer (scoped, registrations: 5)]')
      })
    })

    describe('using util.inspect on the cradle', function() {
      it('should return a summary', function() {
        const container = createContainer()
          .registerValue({ val1: 1, val2: 2 })
          .registerFunction({ fn1: () => true })
          .registerClass({ c1: Repo })

        expect(util.inspect(container.cradle)).to.equal(
          '[AwilixContainer.cradle]'
        )
      })
    })

    describe('using Array.from on the cradle', function() {
      it('should return an Array with registration names', function() {
        const container = createContainer()
          .registerValue({ val1: 1, val2: 2 })
          .registerFunction({ fn1: () => true })
          .registerClass({ c1: Repo })

        expect(Array.from(container.cradle)).to.deep.equal([
          'val1',
          'val2',
          'fn1',
          'c1'
        ])
      })

      it('should return injector keys as well', () => {
        class KeysTest {
          constructor(cradle) {
            this.keys = Array.from(cradle)
          }
        }
        const container = createContainer()
          .registerValue({ val1: 1, val2: 2 })
          .register({
            test: asClass(KeysTest).inject(() => ({ injected: true }))
          })

        const result = container.resolve('test')
        expect(result.keys).to.deep.equal(['val1', 'val2', 'test', 'injected'])
      })
    })

    describe('explicitly trying to fuck shit up', function() {
      it('should prevent you from fucking shit up', function() {
        const container = createContainer({
          resolutionMode: null
        })
          .registerValue({ answer: 42 })
          .registerFunction('theAnswer', ({ answer }) => () => answer)

        const theAnswer = container.resolve('theAnswer')
        expect(theAnswer()).to.equal(42)
      })

      it('should default to PROXY resolution mode when unknown', function() {
        const container = createContainer({
          resolutionMode: 'I dunno maaaang...'
        })
          .registerValue({ answer: 42 })
          .registerFunction('theAnswer', ({ answer }) => () => answer)

        const theAnswer = container.resolve('theAnswer')
        expect(theAnswer()).to.equal(42)
      })
    })
  })

  describe('setting a name on the registration options', () => {
    it('should not work', () => {
      const container = createContainer().registerFunction({
        test: [() => 42, { lifetime: Lifetime.SCOPED, name: 'lol' }]
      })

      expect(container.resolve('test')).to.equal(42)
      expect(container.registrations.lol).to.equal(undefined)
    })
  })

  describe('util.inspect on the cradle', () => {
    it('should not throw an error', () => {
      const container = createContainer()
      const result = util.inspect(container.cradle)
      expect(result).to.equal('[AwilixContainer.cradle]')
    })
  })

  describe('registering and resolving symbols', () => {
    it('works', () => {
      const S1 = Symbol('test 1')
      const S2 = Symbol('test 2')
      const container = createContainer()
        .registerValue({
          [S1]: 42
        })
        .registerValue(S2, 24)

      expect(container.resolve(S1)).to.equal(42)
      expect(container.cradle[S1]).to.equal(42)

      expect(container.resolve(S2)).to.equal(24)
      expect(container.cradle[S2]).to.equal(24)
    })
  })

  describe('spreading the cradle', () => {
    it('does not throw', () => {
      const container = createContainer().registerValue({ val1: 1, val2: 2 })
      expect([...container.cradle]).to.deep.equal(['val1', 'val2'])
    })
  })

  describe('using Object.keys() on the cradle', () => {
    it('should return the registration keys', () => {
      const container = createContainer().registerValue({ val1: 1, val2: 2 })
      expect(Object.keys(container.cradle)).to.deep.equal(['val1', 'val2'])
    })

    it('should return injector keys', () => {
      class KeysTest {
        constructor(cradle) {
          this.keys = Object.keys(cradle)
        }
      }
      const container = createContainer()
        .registerValue({ val1: 1, val2: 2 })
        .register({
          test: asClass(KeysTest).inject(() => ({ injected: true, val2: 10 }))
        })

      const result = container.resolve('test')
      expect(result.keys).to.deep.equal(['val1', 'val2', 'test', 'injected'])
    })
  })

  describe('using Object.getOwnPropertyDescriptor with injector proxy', () => {
    it('returns expected values', () => {
      class KeysTest {
        constructor(cradle) {
          this.testProp = Object.getOwnPropertyDescriptor(cradle, 'test')
          this.nonexistentProp = Object.getOwnPropertyDescriptor(
            cradle,
            'nonexistent'
          )
        }
      }
      const container = createContainer()
        .registerValue({ val1: 1, val2: 2 })
        .register({
          test: asClass(KeysTest).inject(() => ({ injected: true }))
        })

      const result = container.resolve('test')
      expect(result.testProp).to.exist
      expect(result.nonexistentProp).to.not.exist
    })
  })

  describe('using Object.getOwnPropertyDescriptor with container cradle', () => {
    it('returns expected values', () => {
      class KeysTest {
        constructor(cradle) {
          this.testProp = Object.getOwnPropertyDescriptor(cradle, 'test')
          this.nonexistentProp = Object.getOwnPropertyDescriptor(
            cradle,
            'nonexistent'
          )
        }
      }
      const container = createContainer()
        .registerValue({ val1: 1, val2: 2 })
        .register({
          test: asClass(KeysTest)
        })

      const result = container.resolve('test')
      expect(result.testProp).to.exist
      expect(result.nonexistentProp).to.not.exist
    })
  })

  describe('memoizing registrations', () => {
    it('should not cause issues', () => {
      const container = createContainer().registerValue({ val1: 123 })

      const scope1 = container.createScope()
      const scope2 = scope1.createScope()

      expect(scope1.resolve('val1')).to.equal(123)
      expect(scope2.resolve('val1')).to.equal(123)

      container.registerValue({ val2: 321 })
      expect(scope2.resolve('val2')).to.equal(321)
      expect(scope1.resolve('val2')).to.equal(321)

      container.registerValue({ val3: 1337 }).register({
        keys: asFunction(cradle => Object.keys(cradle)).inject(() => ({
          injected: true
        }))
      })
      expect(scope2.resolve('keys')).to.deep.equal([
        'val1',
        'val2',
        'val3',
        'keys',
        'injected'
      ])
    })
  })
})
