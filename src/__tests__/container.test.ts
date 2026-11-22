import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { throws } from 'smid'
import * as util from 'util'
import type { AwilixContainer } from '../container.ts'
import { createContainer as _createContainer } from '../container.ts'
import { Lifetime } from '../lifetime.ts'
import { AwilixResolutionError } from '../errors.ts'
import { aliasTo, asClass, asFunction, asValue } from '../resolvers.ts'
import { InjectionMode } from '../injection-mode.ts'

// This file tests runtime behavior; type inference is tested in type-inference.test.ts.
// Use `any` cradle to avoid type errors on untyped property access.
function createContainer(
  ...args: Parameters<typeof _createContainer>
): AwilixContainer<any> {
  return _createContainer<any>(...args)
}

class Test {
  repo: Repo
  constructor({ repo }: any) {
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
  repo: Repo
  constructor(repo: Repo) {
    this.repo = repo
  }
}

describe('createContainer', () => {
  it('returns an object', () => {
    const container = createContainer()
    assert.strictEqual(typeof container, 'object')
  })
})

describe('container', () => {
  it('lets me register something and resolve it', () => {
    const container = createContainer()
    container.register({ someValue: asValue(42) })
    container.register({
      test: asFunction((deps: any) => {
        return {
          someValue: deps.someValue,
        }
      }),
    })

    const test = container.cradle.test
    assert.ok(test)
    assert.strictEqual(test.someValue, 42)
  })

  it('lets me register something and resolve it via classic injection mode', () => {
    const container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    })
    container.register({
      manual: asClass(ManualTest),
      repo: asClass(Repo),
    })

    const test = container.cradle.manual
    assert.ok(test)
    assert.ok(test.repo)
  })

  describe('register', () => {
    it('supports multiple registrations in a single call', () => {
      const container = createContainer()
      container.register({
        universe: asValue(42),
        leet: asValue(1337),
      })

      container.register({
        service: asFunction(({ func, universe }: any) => ({
          method: () => func(universe),
        })),
        func: asFunction(
          () => (answer: any) => 'Hello world, the answer is ' + answer,
        ),
      })

      assert.strictEqual(Object.keys(container.registrations).length, 4)

      assert.strictEqual(
        container.resolve<any>('service').method(),
        'Hello world, the answer is 42',
      )
    })

    it('supports classes', () => {
      const container = createContainer()
      container.register({
        test: asClass(Test),
        repo: asClass(Repo),
      })

      assert.strictEqual(container.resolve<Test>('test').stuff(), 'stuff')
    })
  })

  describe('has', () => {
    it('returns true if the registration does exist', () => {
      const container = createContainer()
      container.register({ theValue: asValue('theValue') })

      assert.strictEqual(container.hasRegistration('theValue'), true)
    })

    it('returns false if the registration does not exist', () => {
      assert.strictEqual(createContainer().hasRegistration('theValue'), false)
    })

    it('returns false for names that exist on Object.prototype', () => {
      const container = createContainer()
      const scope = container.createScope()
      for (const name of ['constructor', 'toString', 'hasOwnProperty']) {
        assert.strictEqual(container.hasRegistration(name), false)
        assert.strictEqual(scope.hasRegistration(name), false)
        assert.strictEqual(container.getRegistration(name), null)
      }
    })
  })

  describe('resolve', () => {
    it('resolves the dependency graph and supports all resolvers', (t) => {
      class TestClass {
        factoryResult: any
        constructor({ factory }: any) {
          this.factoryResult = factory()
        }
      }

      const factorySpy = t.mock.fn((cradle) => 'factory ' + cradle.value)
      const container = createContainer()
      container.register({ value: asValue(42) })
      container.register({
        factory: asFunction((cradle: any) => () => factorySpy(cradle)),
      })
      container.register({ theClass: asClass(TestClass) })

      const root = container.resolve<TestClass>('theClass')
      assert.strictEqual(root.factoryResult, 'factory 42')
    })

    it('throws an AwilixResolutionError when there are unregistered dependencies', () => {
      const container = createContainer()
      const err = throws(() => container.resolve('nope'))
      assert.ok(err instanceof AwilixResolutionError)
      assert.match(err.message, /nope/i)
    })

    it('does not treat names on Object.prototype as registrations', () => {
      const container = createContainer()
      const err = throws(() => container.resolve('valueOf'))
      assert.ok(err instanceof AwilixResolutionError)
      assert.match(err.message, /valueOf/)
      assert.strictEqual(
        container.resolve('hasOwnProperty', { allowUnregistered: true }),
        undefined,
      )
      assert.strictEqual(
        container
          .createScope()
          .resolve('isPrototypeOf', { allowUnregistered: true }),
        undefined,
      )
    })

    it('throws an AwilixResolutionError that supports symbols', () => {
      const container = createContainer()
      const S = Symbol('i am the derg')
      const err = throws(() => container.resolve(S))
      assert.ok(err instanceof AwilixResolutionError)
      assert.match(err.message, /i am the derg/i)
    })

    it('throws an AwilixResolutionError that supports symbols on multiple levels', () => {
      const container = createContainer()
      const S1 = Symbol('i am the derg')
      const S2 = Symbol('i am not the derg')
      container.register({ [S2]: asFunction(({ [S1]: theDerg }) => theDerg) })
      const err = throws(() => container.resolve(S2))
      assert.ok(err instanceof AwilixResolutionError)
      assert.match(err.message, /i am the derg/i)
    })

    it('throws an AwilixResolutionError with a resolution path when resolving an unregistered dependency', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        second: asFunction((cradle: any) => cradle.third),
        third: asFunction((cradle: any) => cradle.unregistered),
      })

      const err = throws(() => container.resolve('first'))
      assert.ok(err.message.includes('first -> second -> third'))
    })

    it('does not screw up the resolution stack when called twice', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        otherFirst: asFunction((cradle: any) => cradle.second),
        second: asFunction((cradle: any) => cradle.third),
        third: asFunction((cradle: any) => cradle.unregistered),
      })

      const err1 = throws(() => container.resolve('first'))
      const err2 = throws(() => container.resolve('otherFirst'))
      assert.ok(err1.message.includes('first -> second -> third'))
      assert.ok(err2.message.includes('otherFirst -> second -> third'))
    })

    it('supports transient lifetime', () => {
      const container = createContainer()
      let counter = 1
      container.register({
        hehe: asFunction(() => counter++).transient(),
      })

      assert.strictEqual(container.cradle.hehe, 1)
      assert.strictEqual(container.cradle.hehe, 2)
    })

    it('supports singleton lifetime', () => {
      const container = createContainer()
      let counter = 1
      container.register({
        hehe: asFunction(() => counter++).singleton(),
      })

      assert.strictEqual(container.cradle.hehe, 1)
      assert.strictEqual(container.cradle.hehe, 1)
    })

    it('supports scoped lifetime', () => {
      const container = createContainer()
      let scopedCounter = 1
      container.register({
        scoped: asFunction(() => scopedCounter++).scoped(),
      })

      const scope1 = container.createScope()
      assert.strictEqual(scope1.cradle.scoped, 1)
      assert.strictEqual(scope1.cradle.scoped, 1)

      const scope2 = container.createScope()
      assert.strictEqual(scope2.cradle.scoped, 2)
      assert.strictEqual(scope2.cradle.scoped, 2)
    })

    it('caches singletons regardless of scope', () => {
      const container = createContainer()
      let singletonCounter = 1
      container.register({
        singleton: asFunction(() => singletonCounter++).singleton(),
      })

      const scope1 = container.createScope()
      assert.strictEqual(scope1.cradle.singleton, 1)
      assert.strictEqual(scope1.cradle.singleton, 1)

      const scope2 = container.createScope()
      assert.strictEqual(scope2.cradle.singleton, 1)
      assert.strictEqual(scope2.cradle.singleton, 1)
    })

    it('resolves transients regardless of scope', () => {
      const container = createContainer()
      let transientCounter = 1
      container.register({
        transient: asFunction(() => transientCounter++).transient(),
      })

      const scope1 = container.createScope()
      assert.strictEqual(scope1.cradle.transient, 1)
      assert.strictEqual(scope1.cradle.transient, 2)

      const scope2 = container.createScope()
      assert.strictEqual(scope2.cradle.transient, 3)
      assert.strictEqual(scope2.cradle.transient, 4)
    })

    it('does not use parents cache when scoped', () => {
      const container = createContainer()
      let scopedCounter = 1
      container.register({
        scoped: asFunction(() => scopedCounter++).scoped(),
      })

      const scope1 = container.createScope()
      assert.strictEqual(scope1.cradle.scoped, 1)
      assert.strictEqual(scope1.cradle.scoped, 1)

      const scope2 = scope1.createScope()
      assert.strictEqual(scope2.cradle.scoped, 2)
      assert.strictEqual(scope2.cradle.scoped, 2)

      assert.strictEqual(container.cradle.scoped, 3)
      assert.strictEqual(container.cradle.scoped, 3)
      assert.strictEqual(scope2.cradle.scoped, 2)
      assert.strictEqual(scope1.cradle.scoped, 1)
    })

    it('supports the readme example of scopes', () => {
      // Increments the counter every time it is resolved.
      const container = createContainer()
      let counter = 1
      container.register({
        counterValue: asFunction(() => counter++).scoped(),
      })
      const scope1 = container.createScope()
      const scope2 = container.createScope()

      const scope1Child = scope1.createScope()

      assert.strictEqual(scope1.cradle.counterValue === 1, true)
      assert.strictEqual(scope1.cradle.counterValue === 1, true)
      assert.strictEqual(scope2.cradle.counterValue === 2, true)
      assert.strictEqual(scope2.cradle.counterValue === 2, true)

      assert.strictEqual(scope1Child.cradle.counterValue === 3, true)
      // assert that the parent scope was not affected
      assert.strictEqual(scope1.cradle.counterValue === 1, true)
    })

    it('supports nested scopes', () => {
      const container = createContainer()

      // Increments the counter every time it is resolved.
      let counter = 1
      container.register({
        counterValue: asFunction(() => counter++).scoped(),
      })
      const scope1 = container.createScope()
      const scope2 = container.createScope()

      const scope1Child = scope1.createScope()

      assert.strictEqual(scope1.cradle.counterValue, 1)
      assert.strictEqual(scope1.cradle.counterValue, 1)
      assert.strictEqual(scope2.cradle.counterValue, 2)
      assert.strictEqual(scope2.cradle.counterValue, 2)
      assert.strictEqual(scope1Child.cradle.counterValue, 3)
    })

    it('resolves dependencies in scope', () => {
      const container = createContainer()
      // Register a transient function
      // that returns the value of the scope-provided dependency.
      // For this example we could also use scoped lifetime.
      container.register({
        scopedValue: asFunction((cradle: any) => 'Hello ' + cradle.someValue),
      })

      // Create a scope and register a value.
      const scope = container.createScope()
      scope.register({
        someValue: asValue('scope'),
      })

      assert.strictEqual(scope.cradle.scopedValue, 'Hello scope')
    })

    it('cannot find a scope-registered value when resolved from root', () => {
      const container = createContainer()
      // Register a transient function
      // that returns the value of the scope-provided dependency.
      // For this example we could also use scoped lifetime.
      container.register({
        scopedValue: asFunction((cradle: any) => 'Hello ' + cradle.someValue),
      })

      // Create a scope and register a value.
      const scope = container.createScope()
      scope.register({
        someValue: asValue('scope'),
      })

      assert.throws(() => container.cradle.scopedValue, AwilixResolutionError)
    })

    it('supports overwriting values in a scope', () => {
      const container = createContainer()
      // It does not matter when the scope is created,
      // it will still have anything that is registered
      // in it's parent.
      const scope = container.createScope()

      container.register({
        value: asValue('root'),
        usedValue: asFunction((cradle: any) => cradle.value),
      })

      scope.register({
        value: asValue('scope'),
      })

      assert.strictEqual(container.cradle.usedValue, 'root')
      assert.strictEqual(scope.cradle.usedValue, 'scope')
    })

    it('supports default parameters in CLASSIC mode', () => {
      const container = createContainer({
        injectionMode: InjectionMode.CLASSIC,
      })

      class ClassWithDefaults {
        method(p1 = 123) {
          /**/
        }

        val: any
        fn: any

        constructor(val: any, fn: any) {
          this.val = val
          this.fn = fn
        }
      }

      const fnWithDefaults =
        (val = 456, nope = 'nope') =>
        (p: string) =>
          p + nope + val

      container.register({
        val: asValue(123),
        cls: asClass(ClassWithDefaults),
        fn: asFunction(fnWithDefaults),
      })

      assert.strictEqual(container.resolve<ClassWithDefaults>('cls').val, 123)
      assert.strictEqual(
        container.resolve<ClassWithDefaults>('cls').fn('yep'),
        'yepnope123',
      )
    })

    it('throws an AwilixResolutionError when there are cyclic dependencies', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        second: asFunction((cradle: any) => cradle.third),
        third: asFunction((cradle: any) => cradle.second),
      })

      const err = throws(() => container.resolve('first'))
      assert.ok(err.message.includes('first -> second -> third -> second'))
    })

    it('throws an AwilixResolutionError when the lifetime is unknown', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        second: asFunction(() => 'hah', { lifetime: 'lol' as any }),
      })

      const err = throws(() => container.resolve('first'))
      assert.ok(err.message.includes('first -> second'))
      assert.ok(err.message.includes('lol'))
    })

    it('behaves properly when the cradle is returned from an async function', async () => {
      const container = createContainer()
      container.register({ value: asValue(42) })

      async function example() {
        return container.cradle
      }

      const { value } = await example()

      assert.strictEqual(value, 42)
    })
  })

  describe('loadModules', () => {
    let container: AwilixContainer
    beforeEach(() => {
      container = createContainer()
    })

    it('returns the container', () => {
      assert.strictEqual(container.loadModules([]), container)
    })

    it('requires a loader for synchronous loading from native ESM', () => {
      assert.throws(
        () => container.loadModules(['src/__tests__/fixture/services/*.js']),
        { name: 'ReferenceError', message: /require is not defined/ },
      )
    })

    it('imports modules and returns the container if used with esModules true', async () => {
      const loaded = await container.loadModules(
        ['src/__tests__/fixture/services/mainService.js'],
        { esModules: true },
      )

      assert.strictEqual(loaded, container)
      assert.ok(loaded.hasRegistration('mainService'))
    })
  })

  describe('setting a property on the cradle', () => {
    it('should fail', () => {
      assert.throws(() => {
        createContainer().cradle.lol = 'nope'
      }, Error)
    })
  })

  describe('using util.inspect on the container', () => {
    it('should return a summary', () => {
      const container = createContainer().register({
        val1: asValue(1),
        val2: asValue(2),
        fn1: asFunction(() => true),
        c1: asClass(Repo),
      })

      assert.strictEqual(
        util.inspect(container),
        '[AwilixContainer (registrations: 4)]',
      )
      assert.strictEqual(
        util.inspect(container.createScope().register({ val3: asValue(3) })),
        '[AwilixContainer (scoped, registrations: 5)]',
      )

      assert.ok(container.resolve('inspect') instanceof Function)
      assert.ok(container.resolve(util.inspect.custom) instanceof Function)
    })
  })

  describe('using util.inspect on the cradle', () => {
    it('should return the preconfigured string', () => {
      const container = createContainer().register({
        val1: asValue(1),
        val2: asValue(2),
        fn1: asFunction(() => true),
        c1: asClass(Repo),
      })

      assert.strictEqual(
        util.inspect(container.cradle),
        '[object AwilixContainerCradle]',
      )
    })
  })

  describe('resolving reserved names', () => {
    it('returns the createContainer function for constructor', () => {
      const container = createContainer()
      assert.strictEqual(container.resolve('constructor'), _createContainer)
    })
  })

  describe('using Array.from on the cradle', () => {
    it('should return an Array with registration names', () => {
      const container = createContainer().register({
        val1: asValue(1),
        val2: asValue(2),
        fn1: asFunction(() => true),
        c1: asClass(Repo),
      })

      assert.deepStrictEqual(Array.from(container.cradle), [
        'val1',
        'val2',
        'fn1',
        'c1',
      ])
    })

    it('should return injector keys as well', () => {
      class KeysTest {
        keys: Array<string>
        constructor(cradle: any) {
          this.keys = Array.from(cradle)
        }
      }
      const container = createContainer().register({
        val1: asValue(1),
        val2: asValue(2),
        test: asClass(KeysTest).inject(() => ({ injected: true })),
      })

      const result = container.resolve<KeysTest>('test')
      assert.deepStrictEqual(result.keys, ['val1', 'val2', 'test', 'injected'])
    })
  })

  describe('explicitly trying to fuck shit up', () => {
    it('should prevent you from fucking shit up', () => {
      const container = createContainer({
        injectionMode: null as any,
      }).register({
        answer: asValue(42),
        theAnswer: asFunction(
          ({ answer }: any) =>
            () =>
              answer,
        ),
      })

      const theAnswer = container.resolve<() => number>('theAnswer')
      assert.strictEqual(theAnswer(), 42)
    })

    it('should default to PROXY injection mode when unknown', () => {
      const container = createContainer({
        injectionMode: 'I dunno maaaang...' as any,
      }).register({
        answer: asValue(42),
        theAnswer: asFunction(
          ({ answer }: any) =>
            () =>
              answer,
        ),
      })

      const theAnswer = container.resolve<() => number>('theAnswer')
      assert.strictEqual(theAnswer(), 42)
    })
  })

  describe('strict mode', () => {
    describe('lifetime mismatch check', () => {
      it('allows longer lifetime modules to depend on shorter lifetime dependencies by default', () => {
        const container = createContainer()
        container.register({
          first: asFunction((cradle: any) => cradle.second, {
            lifetime: Lifetime.SCOPED,
          }),
          second: asFunction(() => 'hah'),
        })

        assert.strictEqual(container.resolve('first'), 'hah')
      })

      it('throws an AwilixResolutionError when longer lifetime modules depend on shorter lifetime dependencies and strict is set', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.second, {
            lifetime: Lifetime.SCOPED,
          }),
          second: asFunction(() => 'hah'),
        })

        const err = throws(() => container.resolve('first'))
        assert.ok(err.message.includes('first -> second'))
        assert.ok(
          err.message.includes(
            "Dependency 'second' has a shorter lifetime than its ancestor: 'first'",
          ),
        )
      })

      it('does not throw an error when an injector proxy is used and strict is set', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.injected, {
            lifetime: Lifetime.SCOPED,
          }).inject(() => ({ injected: 'hah' })),
          injected: asFunction(() => 'foobar'),
        })

        assert.strictEqual(container.resolve('first'), 'hah')
      })

      it('allows for asValue() to be used when strict is set', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.val, {
            lifetime: Lifetime.SCOPED,
          }),
          second: asFunction((cradle: any) => cradle.secondVal, {
            lifetime: Lifetime.SINGLETON,
          }),
          val: asValue('hah'),
          secondVal: asValue('foobar'),
        })

        assert.strictEqual(container.resolve('first'), 'hah')
        assert.strictEqual(container.resolve('second'), 'foobar')
      })

      it('allows aliasTo to be used when strict is set', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.second, {
            lifetime: Lifetime.SINGLETON,
          }),
          second: aliasTo('val'),
          val: asValue('hah'),
        })

        assert.strictEqual(container.resolve('first'), 'hah')
      })

      it('detects when an aliasTo resolution violates lifetime constraints', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.second, {
            lifetime: Lifetime.SCOPED,
          }),
          second: aliasTo('val'),
          val: asValue('hah'),
        })
        const scope = container.createScope()
        scope.register({
          val: asFunction(() => 'foobar'),
        })

        const err = throws(() => scope.resolve('first'))
        assert.ok(err.message.includes('first -> second -> val'))
        assert.ok(
          err.message.includes(
            "Dependency 'val' has a shorter lifetime than its ancestor: 'first'",
          ),
        )
      })
    })

    describe('singleton resolution using only root container', () => {
      it('resolves singletons using root container only, even if called from scope', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          scoped: asFunction((cradle: any) => cradle.val, {
            lifetime: Lifetime.SCOPED,
          }),
          singleton: asFunction((cradle: any) => cradle.val, {
            lifetime: Lifetime.SINGLETON,
          }),
        })
        const scope = container.createScope()

        let err = throws(() => scope.resolve('scoped'))
        assert.ok(err instanceof AwilixResolutionError)
        assert.ok(err.message.includes('scoped -> val'))

        scope.register({
          val: asValue('foobar'),
        })

        assert.strictEqual(scope.resolve('scoped'), 'foobar')

        err = throws(() => scope.resolve('singleton'))
        assert.ok(err instanceof AwilixResolutionError)
        assert.ok(err.message.includes('singleton -> val'))

        container.register({
          val: asValue('hah'),
        })

        assert.strictEqual(scope.resolve('singleton'), 'hah')
      })

      it('preserves the resolution stack when resolving a singleton using a parent container, from a scope', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          scoped: asFunction((cradle: any) => cradle.singleton, {
            lifetime: Lifetime.SCOPED,
          }),
          singleton: asFunction((cradle: any) => cradle.val, {
            lifetime: Lifetime.SINGLETON,
          }),
        })
        const scope = container.createScope()

        const err = throws(() => scope.resolve('scoped'))
        assert.ok(err instanceof AwilixResolutionError)
        assert.ok(err.message.includes('scoped -> singleton -> val'))
      })
    })

    describe('singleton registration on scope check', () => {
      it('detects and errors when a singleton is registered on a scope', () => {
        const container = createContainer({
          strict: true,
        })
        const scope = container.createScope()
        const err = throws(() =>
          scope.register({
            test: asFunction(() => 42, { lifetime: Lifetime.SINGLETON }),
          }),
        )
        assert.ok(err.message.includes("Could not register 'test'"))
        assert.ok(
          err.message.includes(
            'Cannot register a singleton on a scoped container',
          ),
        )
      })
    })
  })
})

describe('setting a name on the registration options', () => {
  it('should not work', () => {
    const container = createContainer().register({
      test: asFunction(() => 42, { lifetime: Lifetime.SCOPED, name: 'lol' }),
    })

    assert.strictEqual(container.resolve('test'), 42)
    assert.strictEqual(container.registrations.lol, undefined)
  })
})

describe('registering and resolving symbols', () => {
  it('works', () => {
    const S1 = Symbol('test 1')
    const S2 = Symbol('test 2')
    const container = createContainer()
      .register({
        [S1]: asValue(42),
      })
      .register(S2, asValue(24))

    assert.strictEqual(container.resolve(S1), 42)
    assert.strictEqual(container.cradle[S1], 42)

    assert.strictEqual(container.resolve(S2), 24)
    assert.strictEqual(container.cradle[S2], 24)
  })
})

describe('spreading the cradle', () => {
  it('does not throw', () => {
    const container = createContainer().register({
      val1: asValue(1),
      val2: asValue(2),
    })
    assert.deepStrictEqual([...container.cradle], ['val1', 'val2'])
  })
})

describe('using Object.keys() on the cradle', () => {
  it('should return the registration keys', () => {
    const container = createContainer().register({
      val1: asValue(1),
      val2: asValue(2),
    })
    assert.deepStrictEqual(Object.keys(container.cradle), ['val1', 'val2'])
  })

  it('should return injector keys', () => {
    class KeysTest {
      keys: Array<string>
      constructor(cradle: any) {
        this.keys = Object.keys(cradle)
      }
    }
    const container = createContainer().register({
      val1: asValue(1),
      val2: asValue(2),
      test: asClass(KeysTest).inject(() => ({ injected: true, val2: 10 })),
    })

    const result = container.resolve<KeysTest>('test')
    assert.deepStrictEqual(result.keys, ['val1', 'val2', 'test', 'injected'])
  })
})

describe('using Object.getOwnPropertyDescriptor with injector proxy', () => {
  it('returns expected values', () => {
    class KeysTest {
      nonexistentProp: PropertyDescriptor | undefined
      testProp: PropertyDescriptor | undefined
      constructor(cradle: any) {
        this.testProp = Object.getOwnPropertyDescriptor(cradle, 'test')
        this.nonexistentProp = Object.getOwnPropertyDescriptor(
          cradle,
          'nonexistent',
        )
      }
    }
    const container = createContainer()
      .register({ val1: asValue(1), val2: asValue(2) })
      .register({
        test: asClass(KeysTest).inject(() => ({ injected: true })),
      })

    const result = container.resolve<KeysTest>('test')
    assert.notStrictEqual(result.testProp, undefined)
    assert.ok(!result.nonexistentProp)
  })
})

describe('using Object.getOwnPropertyDescriptor with container cradle', () => {
  it('returns expected values', () => {
    class KeysTest {
      nonexistentProp: PropertyDescriptor | undefined
      testProp: PropertyDescriptor | undefined
      constructor(cradle: any) {
        this.testProp = Object.getOwnPropertyDescriptor(cradle, 'test')
        this.nonexistentProp = Object.getOwnPropertyDescriptor(
          cradle,
          'nonexistent',
        )
      }
    }
    const container = createContainer()
      .register({ val1: asValue(1), val2: asValue(2) })
      .register({
        test: asClass(KeysTest),
      })

    const result = container.resolve<KeysTest>('test')
    assert.notStrictEqual(result.testProp, undefined)
    assert.ok(!result.nonexistentProp)
  })
})

describe('memoizing registrations', () => {
  it('should not cause issues', () => {
    const container = createContainer().register({ val1: asValue(123) })

    const scope1 = container.createScope()
    const scope2 = scope1.createScope()

    assert.strictEqual(scope1.resolve('val1'), 123)
    assert.strictEqual(scope2.resolve('val1'), 123)

    container.register({ val2: asValue(321) })
    assert.strictEqual(scope2.resolve('val2'), 321)
    assert.strictEqual(scope1.resolve('val2'), 321)

    container.register({ val3: asValue(1337) }).register({
      keys: asFunction((cradle: any) => Object.keys(cradle)).inject(() => ({
        injected: true,
      })),
    })
    assert.deepStrictEqual(scope2.resolve('keys'), [
      'val1',
      'val2',
      'val3',
      'keys',
      'injected',
    ])
  })

  describe('build', () => {
    const fn = (val: any) => val
    const container = createContainer().register({ val: asValue(1337) })

    class BuildTest {
      val: any
      constructor({ val }: any) {
        this.val = val
      }
    }

    it('throws when the target is falsy', () => {
      assert.throws(() => createContainer().build(null!), /null/)
      assert.throws(() => createContainer().build(undefined!), /undefined/)
      assert.throws(() => createContainer().build({} as any), /object/)
    })

    it('returns resolved value when passed a resolver', () => {
      assert.strictEqual(container.build(asFunction(fn).classic()), 1337)
      assert.ok(
        container.build(asClass(BuildTest).proxy()) instanceof BuildTest,
      )
      assert.strictEqual(container.build(asClass(BuildTest).proxy()).val, 1337)
    })

    it('returns resolved value when passed a function', () => {
      assert.strictEqual(
        container.build(fn, { injectionMode: InjectionMode.CLASSIC }),
        1337,
      )
    })

    it('returns resolved value when passed a class', () => {
      assert.ok(container.build(BuildTest) instanceof BuildTest)
      assert.strictEqual(container.build(BuildTest).val, 1337)
    })

    it('uses containers injection mode by default', () => {
      const otherContainer = createContainer({
        injectionMode: InjectionMode.CLASSIC,
      })
      otherContainer.register({ val: asValue(1337) })
      assert.strictEqual(otherContainer.build(fn), 1337)
    })

    it('injects the parameters of a named generator function', () => {
      const values = container.build(
        asFunction(function* makeValues(val: number) {
          yield val
        }).classic(),
      )
      assert.deepStrictEqual([...values], [1337])
    })
  })

  describe('well-known names and symbols', () => {
    it('should have toJSON() return [object AwilixContainerCradle]', () => {
      assert.strictEqual(
        createContainer().cradle.toJSON(),
        '[object AwilixContainerCradle]',
      )
    })

    it('JSON.stringify() should return [object AwilixContainerCradle]', () => {
      assert.strictEqual(
        JSON.stringify(createContainer().cradle),
        '"[object AwilixContainerCradle]"',
      )
    })

    it('Symbol.toStringTag', () => {
      const result = Object.prototype.toString.call(createContainer().cradle)
      assert.strictEqual(result, '[object AwilixContainerCradle]')
    })

    it('toString() should return [object AwilixContainerCradle]', () => {
      assert.strictEqual(
        createContainer().cradle.toString(),
        '[object AwilixContainerCradle]',
      )
    })
  })
})

describe('cycle detection edge cases', () => {
  it('detects a self-referencing dependency (A -> A)', () => {
    const container = createContainer()
    container.register({
      selfRef: asFunction((cradle: any) => cradle.selfRef),
    })

    const err = throws(() => container.resolve('selfRef'))
    assert.ok(err instanceof AwilixResolutionError)
    assert.ok(err.message.includes('selfRef -> selfRef'))
  })

  it('detects a cycle across scopes', () => {
    const parent = createContainer()
    parent.register({
      a: asFunction((cradle: any) => cradle.b),
    })
    const child = parent.createScope()
    child.register({
      b: asFunction((cradle: any) => cradle.a),
    })

    const err = throws(() => child.resolve('a'))
    assert.ok(err instanceof AwilixResolutionError)
    assert.ok(err.message.includes('a -> b -> a'))
  })

  it('detects a cycle with Symbol keys', () => {
    const SA = Symbol('symA')
    const SB = Symbol('symB')
    const container = createContainer()
    container.register({
      [SA]: asFunction((cradle: any) => cradle[SB]),
      [SB]: asFunction((cradle: any) => cradle[SA]),
    })

    const err = throws(() => container.resolve(SA))
    assert.ok(err instanceof AwilixResolutionError)
    assert.ok(err.message.includes('Symbol(symA)'))
    assert.ok(err.message.includes('Symbol(symB)'))
  })
})

describe('resolution stack integrity', () => {
  it('successful resolve then failing resolve in same factory has correct stack', () => {
    const container = createContainer()
    container.register({
      good: asValue('ok'),
      faulty: asFunction((cradle: any) => {
        // Resolve a valid dependency first to verify the resolution stack
        // only contains the failing path, not this successful one.
        void cradle.good
        return cradle.missing // fails
      }),
    })

    const err = throws(() => container.resolve('faulty'))
    assert.ok(err instanceof AwilixResolutionError)
    assert.ok(err.message.includes('faulty -> missing'))
    assert.strictEqual(err.message.includes('good'), false)
  })
})

describe('strict mode deep chains', () => {
  it('resolves a 5-level deep all-SCOPED chain without error', () => {
    const container = createContainer({ strict: true })
    container.register({
      s1: asFunction((cradle: any) => cradle.s2, {
        lifetime: Lifetime.SCOPED,
      }),
      s2: asFunction((cradle: any) => cradle.s3, {
        lifetime: Lifetime.SCOPED,
      }),
      s3: asFunction((cradle: any) => cradle.s4, {
        lifetime: Lifetime.SCOPED,
      }),
      s4: asFunction((cradle: any) => cradle.s5, {
        lifetime: Lifetime.SCOPED,
      }),
      s5: asFunction(() => 'deep-scoped-value', {
        lifetime: Lifetime.SCOPED,
      }),
    })

    const scope = container.createScope()
    assert.strictEqual(scope.resolve('s1'), 'deep-scoped-value')
  })

  it('detects lifetime violation on cached scoped value resolved through a longer-lived ancestor', () => {
    const container = createContainer({ strict: true })
    container.register({
      singletonDep: asFunction((cradle: any) => cradle.scopedVal, {
        lifetime: Lifetime.SINGLETON,
      }),
      scopedVal: asFunction(() => 'scoped-result', {
        lifetime: Lifetime.SCOPED,
      }),
    })

    // First: resolve the scoped value so it gets cached on the root container.
    assert.strictEqual(container.resolve('scopedVal'), 'scoped-result')
    // Now resolve a singleton that depends on it — the cached scoped value
    // must still be checked for lifetime leakage.
    const err = throws(() => container.resolve('singletonDep'))
    assert.ok(err instanceof AwilixResolutionError)
    assert.ok(
      err.message.includes(
        "Dependency 'scopedVal' has a shorter lifetime than its ancestor: 'singletonDep'",
      ),
    )
  })
})

describe('registration lookup and cache invalidation', () => {
  it('resolves root registration from deeply nested scope (6+ levels)', () => {
    const root = createContainer()
    root.register({ deepVal: asValue('from-root') })

    let current = root.createScope()
    for (let i = 0; i < 5; i++) {
      current = current.createScope()
    }

    assert.strictEqual(current.resolve('deepVal'), 'from-root')
  })

  it('child resolves updated parent registration (transient)', () => {
    const parent = createContainer()
    parent.register({ val: asFunction(() => 'original') })

    const child = parent.createScope()
    assert.strictEqual(child.resolve('val'), 'original')

    parent.register({ val: asFunction(() => 'updated') })
    assert.strictEqual(child.resolve('val'), 'updated')
  })

  it('local registration shadows parent even after parent re-registers', () => {
    const parent = createContainer()
    parent.register({ val: asFunction(() => 'parent-v1') })

    const child = parent.createScope()
    child.register({ val: asFunction(() => 'child-local') })

    assert.strictEqual(child.resolve('val'), 'child-local')

    parent.register({ val: asFunction(() => 'parent-v2') })
    assert.strictEqual(child.resolve('val'), 'child-local')
  })
})
