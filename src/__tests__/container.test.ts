import { throws } from 'smid'
import * as util from 'util'
import { createContainer, AwilixContainer } from '../container'
import { Lifetime } from '../lifetime'
import { AwilixResolutionError } from '../errors'
import { asClass, asFunction, asValue } from '../resolvers'
import { InjectionMode } from '../injection-mode'

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
    expect(typeof container).toBe('object')
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
    expect(test).toBeTruthy()
    expect(test.someValue).toBe(42)
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
    expect(test).toBeTruthy()
    expect(test.repo).toBeTruthy()
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

      expect(Object.keys(container.registrations).length).toBe(4)

      expect(container.resolve<any>('service').method()).toBe(
        'Hello world, the answer is 42',
      )
    })

    it('supports classes', () => {
      const container = createContainer()
      container.register({
        test: asClass(Test),
        repo: asClass(Repo),
      })

      expect(container.resolve<Test>('test').stuff()).toBe('stuff')
    })
  })

  describe('has', () => {
    it('returns true if the registration does exist', () => {
      const container = createContainer()
      container.register({ theValue: asValue('theValue') })

      expect(container.hasRegistration('theValue')).toBe(true)
    })

    it('returns false if the registration does not exist', () => {
      expect(createContainer().hasRegistration('theValue')).toBe(false)
    })
  })

  describe('resolve', () => {
    it('resolves the dependency graph and supports all resolvers', () => {
      class TestClass {
        factoryResult: any
        constructor({ factory }: any) {
          this.factoryResult = factory()
        }
      }

      const factorySpy = jest.fn((cradle) => 'factory ' + cradle.value)
      const container = createContainer()
      container.register({ value: asValue(42) })
      container.register({
        factory: asFunction((cradle: any) => () => factorySpy(cradle)),
      })
      container.register({ theClass: asClass(TestClass) })

      const root = container.resolve<TestClass>('theClass')
      expect(root.factoryResult).toBe('factory 42')
    })

    it('throws an AwilixResolutionError when there are unregistered dependencies', () => {
      const container = createContainer()
      const err = throws(() => container.resolve('nope'))
      expect(err).toBeInstanceOf(AwilixResolutionError)
      expect(err.message).toMatch(/nope/i)
    })

    it('throws an AwilixResolutionError that supports symbols', () => {
      const container = createContainer()
      const S = Symbol('i am the derg')
      const err = throws(() => container.resolve(S))
      expect(err).toBeInstanceOf(AwilixResolutionError)
      expect(err.message).toMatch(/i am the derg/i)
    })

    it('throws an AwilixResolutionError that supports symbols on multiple levels', () => {
      const container = createContainer()
      const S1 = Symbol('i am the derg')
      const S2 = Symbol('i am not the derg')
      container.register({ [S2]: asFunction(({ [S1]: theDerg }) => theDerg) })
      const err = throws(() => container.resolve(S2))
      expect(err).toBeInstanceOf(AwilixResolutionError)
      expect(err.message).toMatch(/i am the derg/i)
    })

    it('throws an AwilixResolutionError with a resolution path when resolving an unregistered dependency', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        second: asFunction((cradle: any) => cradle.third),
        third: asFunction((cradle: any) => cradle.unregistered),
      })

      const err = throws(() => container.resolve('first'))
      expect(err.message).toContain('first -> second -> third')
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
      expect(err1.message).toContain('first -> second -> third')
      expect(err2.message).toContain('otherFirst -> second -> third')
    })

    it('supports transient lifetime', () => {
      const container = createContainer()
      let counter = 1
      container.register({
        hehe: asFunction(() => counter++).transient(),
      })

      expect(container.cradle.hehe).toBe(1)
      expect(container.cradle.hehe).toBe(2)
    })

    it('supports singleton lifetime', () => {
      const container = createContainer()
      let counter = 1
      container.register({
        hehe: asFunction(() => counter++).singleton(),
      })

      expect(container.cradle.hehe).toBe(1)
      expect(container.cradle.hehe).toBe(1)
    })

    it('supports scoped lifetime', () => {
      const container = createContainer()
      let scopedCounter = 1
      container.register({
        scoped: asFunction(() => scopedCounter++).scoped(),
      })

      const scope1 = container.createScope()
      expect(scope1.cradle.scoped).toBe(1)
      expect(scope1.cradle.scoped).toBe(1)

      const scope2 = container.createScope()
      expect(scope2.cradle.scoped).toBe(2)
      expect(scope2.cradle.scoped).toBe(2)
    })

    it('caches singletons regardless of scope', () => {
      const container = createContainer()
      let singletonCounter = 1
      container.register({
        singleton: asFunction(() => singletonCounter++).singleton(),
      })

      const scope1 = container.createScope()
      expect(scope1.cradle.singleton).toBe(1)
      expect(scope1.cradle.singleton).toBe(1)

      const scope2 = container.createScope()
      expect(scope2.cradle.singleton).toBe(1)
      expect(scope2.cradle.singleton).toBe(1)
    })

    it('resolves transients regardless of scope', () => {
      const container = createContainer()
      let transientCounter = 1
      container.register({
        transient: asFunction(() => transientCounter++).transient(),
      })

      const scope1 = container.createScope()
      expect(scope1.cradle.transient).toBe(1)
      expect(scope1.cradle.transient).toBe(2)

      const scope2 = container.createScope()
      expect(scope2.cradle.transient).toBe(3)
      expect(scope2.cradle.transient).toBe(4)
    })

    it('does not use parents cache when scoped', () => {
      const container = createContainer()
      let scopedCounter = 1
      container.register({
        scoped: asFunction(() => scopedCounter++).scoped(),
      })

      const scope1 = container.createScope()
      expect(scope1.cradle.scoped).toBe(1)
      expect(scope1.cradle.scoped).toBe(1)

      const scope2 = scope1.createScope()
      expect(scope2.cradle.scoped).toBe(2)
      expect(scope2.cradle.scoped).toBe(2)

      expect(container.cradle.scoped).toBe(3)
      expect(container.cradle.scoped).toBe(3)
      expect(scope2.cradle.scoped).toBe(2)
      expect(scope1.cradle.scoped).toBe(1)
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

      expect(scope1.cradle.counterValue === 1).toBe(true)
      expect(scope1.cradle.counterValue === 1).toBe(true)
      expect(scope2.cradle.counterValue === 2).toBe(true)
      expect(scope2.cradle.counterValue === 2).toBe(true)

      expect(scope1Child.cradle.counterValue === 3).toBe(true)
      // assert that the parent scope was not affected
      expect(scope1.cradle.counterValue === 1).toBe(true)
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

      expect(scope1.cradle.counterValue).toBe(1)
      expect(scope1.cradle.counterValue).toBe(1)
      expect(scope2.cradle.counterValue).toBe(2)
      expect(scope2.cradle.counterValue).toBe(2)
      expect(scope1Child.cradle.counterValue).toBe(3)
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

      expect(scope.cradle.scopedValue).toBe('Hello scope')
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

      expect(() => container.cradle.scopedValue).toThrowError(
        AwilixResolutionError,
      )
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

      expect(container.cradle.usedValue).toBe('root')
      expect(scope.cradle.usedValue).toBe('scope')
    })

    it('supports default parameters in CLASSIC mode', () => {
      const container = createContainer({
        injectionMode: InjectionMode.CLASSIC,
      })

      class ClassWithDefaults {
        method(p1 = 123) {
          /**/
        }

        // tslint:disable-next-line:member-ordering
        constructor(
          public val: any,
          public fn: any,
        ) {
          /**/
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

      expect(container.resolve<ClassWithDefaults>('cls').val).toBe(123)
      expect(container.resolve<ClassWithDefaults>('cls').fn('yep')).toBe(
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
      expect(err.message).toContain('first -> second -> third -> second')
    })

    it('throws an AwilixResolutionError when the lifetime is unknown', () => {
      const container = createContainer()
      container.register({
        first: asFunction((cradle: any) => cradle.second),
        second: asFunction(() => 'hah', { lifetime: 'lol' as any }),
      })

      const err = throws(() => container.resolve('first'))
      expect(err.message).toContain('first -> second')
      expect(err.message).toContain('lol')
    })

    it('behaves properly when the cradle is returned from an async function', async () => {
      const container = createContainer()
      container.register({ value: asValue(42) })

      async function example() {
        return container.cradle
      }

      const { value } = await example()

      expect(value).toBe(42)
    })
  })

  describe('loadModules', () => {
    let container: AwilixContainer
    beforeEach(() => {
      container = createContainer()
    })

    it('returns the container', () => {
      expect(container.loadModules([])).toBe(container)
    })

    it('returns a Promise of the container if used with esModules true', async () => {
      expect(await container.loadModules([], { esModules: true })).toBe(
        container,
      )
    })
  })

  describe('setting a property on the cradle', () => {
    it('should fail', () => {
      expect(() => {
        createContainer().cradle.lol = 'nope'
      }).toThrowError(Error)
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

      expect(util.inspect(container)).toBe(
        '[AwilixContainer (registrations: 4)]',
      )
      expect(
        util.inspect(container.createScope().register({ val3: asValue(3) })),
      ).toBe('[AwilixContainer (scoped, registrations: 5)]')

      expect(container.resolve('inspect')).toBeInstanceOf(Function)
      expect(container.resolve(util.inspect.custom)).toBeInstanceOf(Function)
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

      expect(util.inspect(container.cradle)).toBe(
        '[object AwilixContainerCradle]',
      )
    })
  })

  describe('resolving reserved names', () => {
    it('returns the createContainer function for constructor', () => {
      const container = createContainer()
      expect(container.resolve('constructor')).toBe(createContainer)
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

      expect(Array.from(container.cradle)).toEqual([
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
      expect(result.keys).toEqual(['val1', 'val2', 'test', 'injected'])
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
      expect(theAnswer()).toBe(42)
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
      expect(theAnswer()).toBe(42)
    })
  })

  describe('automatic asValue lifetime handling', () => {
    it('sets values to singleton lifetime when registered on the root container', () => {
      const container = createContainer()
      container.register({
        val: asValue(42),
      })
      const registration = container.getRegistration('val')
      expect(registration).toBeTruthy()
      expect(registration!.lifetime).toBe(Lifetime.SINGLETON)
    })
    it('sets values to scoped lifetime when registered on a scope container', () => {
      const container = createContainer()
      const scope = container.createScope()
      scope.register({
        val: asValue(42),
      })
      const registration = scope.getRegistration('val')
      expect(registration).toBeTruthy()
      expect(registration!.lifetime).toBe(Lifetime.SCOPED)
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

        expect(container.resolve('first')).toBe('hah')
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
        expect(err.message).toContain('first -> second')
        expect(err.message).toContain(
          "Dependency 'second' has a shorter lifetime than its ancestor: 'first'",
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
        })

        expect(container.resolve('first')).toBe('hah')
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

        expect(container.resolve('first')).toBe('hah')
        expect(container.resolve('second')).toBe('foobar')
      })

      it('correctly errors when a singleton parent depends on a scoped value and strict is set', () => {
        const container = createContainer({
          strict: true,
        })
        container.register({
          first: asFunction((cradle: any) => cradle.second, {
            lifetime: Lifetime.SINGLETON,
          }),
          second: asValue('hah'),
        })
        const scope = container.createScope()
        scope.register({
          second: asValue('foobar'),
        })

        const err = throws(() => scope.resolve('first'))
        expect(err.message).toContain('first -> second')
        expect(err.message).toContain(
          "Dependency 'second' has a shorter lifetime than its ancestor: 'first'",
        )
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
        expect(err.message).toContain("Could not register 'test'")
        expect(err.message).toContain(
          'Cannot register a singleton on a scoped container',
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

    expect(container.resolve('test')).toBe(42)
    expect(container.registrations.lol).toBe(undefined)
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

    expect(container.resolve(S1)).toBe(42)
    expect(container.cradle[S1]).toBe(42)

    expect(container.resolve(S2)).toBe(24)
    expect(container.cradle[S2]).toBe(24)
  })
})

describe('spreading the cradle', () => {
  it('does not throw', () => {
    const container = createContainer().register({
      val1: asValue(1),
      val2: asValue(2),
    })
    expect([...container.cradle]).toEqual(['val1', 'val2'])
  })
})

describe('using Object.keys() on the cradle', () => {
  it('should return the registration keys', () => {
    const container = createContainer().register({
      val1: asValue(1),
      val2: asValue(2),
    })
    expect(Object.keys(container.cradle)).toEqual(['val1', 'val2'])
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
    expect(result.keys).toEqual(['val1', 'val2', 'test', 'injected'])
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
    expect(result.testProp).toBeDefined()
    expect(result.nonexistentProp).toBeFalsy()
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
    expect(result.testProp).toBeDefined()
    expect(result.nonexistentProp).toBeFalsy()
  })
})

describe('memoizing registrations', () => {
  it('should not cause issues', () => {
    const container = createContainer().register({ val1: asValue(123) })

    const scope1 = container.createScope()
    const scope2 = scope1.createScope()

    expect(scope1.resolve('val1')).toBe(123)
    expect(scope2.resolve('val1')).toBe(123)

    container.register({ val2: asValue(321) })
    expect(scope2.resolve('val2')).toBe(321)
    expect(scope1.resolve('val2')).toBe(321)

    container.register({ val3: asValue(1337) }).register({
      keys: asFunction((cradle: any) => Object.keys(cradle)).inject(() => ({
        injected: true,
      })),
    })
    expect(scope2.resolve('keys')).toEqual([
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
      expect(() => createContainer().build(null!)).toThrowError(/null/)
      expect(() => createContainer().build(undefined!)).toThrowError(
        /undefined/,
      )
      expect(() => createContainer().build({} as any)).toThrowError(/object/)
    })

    it('returns resolved value when passed a resolver', () => {
      expect(container.build(asFunction(fn).classic())).toBe(1337)
      expect(container.build(asClass(BuildTest).proxy())).toBeInstanceOf(
        BuildTest,
      )
      expect(container.build(asClass(BuildTest).proxy()).val).toBe(1337)
    })

    it('returns resolved value when passed a function', () => {
      expect(
        container.build(fn, { injectionMode: InjectionMode.CLASSIC }),
      ).toBe(1337)
    })

    it('returns resolved value when passed a class', () => {
      expect(container.build(BuildTest)).toBeInstanceOf(BuildTest)
      expect(container.build(BuildTest).val).toBe(1337)
    })

    it('uses containers injection mode by default', () => {
      const otherContainer = createContainer({
        injectionMode: InjectionMode.CLASSIC,
      })
      otherContainer.register({ val: asValue(1337) })
      expect(otherContainer.build(fn)).toBe(1337)
    })
  })

  describe('well-known names and symbols', () => {
    it('should have toJSON() return [object AwilixContainerCradle]', () => {
      expect(createContainer().cradle.toJSON()).toBe(
        '[object AwilixContainerCradle]',
      )
    })

    it('JSON.stringify() should return [object AwilixContainerCradle]', () => {
      expect(JSON.stringify(createContainer().cradle)).toBe(
        '"[object AwilixContainerCradle]"',
      )
    })

    it('Symbol.toStringTag', () => {
      const result = Object.prototype.toString.call(createContainer().cradle)
      expect(result).toBe('[object AwilixContainerCradle]')
    })
  })
})
