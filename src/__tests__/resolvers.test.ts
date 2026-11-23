import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { throws } from 'smid'
import { asValue, asFunction, asClass } from '../resolvers.ts'
import type { AwilixContainer } from '../container.ts'
import { createContainer } from '../container.ts'
import { Lifetime } from '../lifetime.ts'
import { InjectionMode } from '../injection-mode.ts'
import { AwilixTypeError } from '../errors.ts'
import { aliasTo } from '../awilix.ts'

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
      assert.strictEqual(typeof asValue(42).resolve, 'function')
    })
  })

  describe('asFunction', () => {
    it('creates a registration with a resolve method', () => {
      assert.strictEqual(typeof asFunction(testFn).resolve, 'function')
    })

    it('defaults to transient', (t) => {
      const testSpy = t.mock.fn(testFn)
      const reg = asFunction(() => testSpy())
      reg.resolve(container)
      reg.resolve(container)

      assert.strictEqual(testSpy.mock.callCount(), 2)
    })

    it('manually resolves function dependencies', () => {
      container.register({
        testClass: asClass(TestClass).classic(),
      })
      const reg = asFunction(depsFn).classic()
      const result = reg.resolve(container)
      assert.strictEqual(typeof reg.resolve, 'function')
      assert.ok(result instanceof TestClass)
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
      assert.strictEqual(typeof reg.resolve, 'function')
      assert.ok(result.testClass instanceof TestClass)
      assert.ok(result.needsCradle instanceof NeedsCradle)
    })

    it('supports arrow functions', () => {
      const arrowWithParen = (dep: any) => dep
      const arrowWithoutParen: (arg: any) => any = (dep) => dep
      container.register({
        withParen: asFunction(arrowWithParen).classic(),
        withoutParen: asFunction(arrowWithoutParen).classic(),
        dep: asValue(42),
      })

      assert.strictEqual(container.resolve('withParen'), 42)
      assert.strictEqual(container.resolve('withoutParen'), 42)
    })

    it('throws AwilixTypeError when given null', () => {
      const err = throws(() => asFunction(null as any))
      assert.ok(err instanceof AwilixTypeError)
    })
  })

  describe('asClass', () => {
    it('creates a registration with a resolve method', () => {
      assert.strictEqual(typeof asClass(TestClass).resolve, 'function')
    })

    it('resolves the class by newing it up', () => {
      const reg = asClass(TestClass)
      const result = reg.resolve(container)
      assert.ok(result instanceof TestClass)
    })

    it('resolves dependencies manually', () => {
      container.register({
        testClass: asClass(TestClass),
      })
      const withDepsReg = asClass(WithDeps).classic()
      const result = withDepsReg.resolve(container)
      assert.ok(result instanceof WithDeps)
      assert.ok(result.testClass instanceof TestClass)
    })

    it('resolves single dependency as cradle', () => {
      container.register({
        testClass: asClass(TestClass),
      })
      const reg = asClass(NeedsCradle).proxy()
      const result = reg.resolve(container)
      assert.ok(result instanceof NeedsCradle)
      assert.ok(result.testClass instanceof TestClass)
    })

    it('resolves a destructured constructor with a final default value', () => {
      class Repo {
        db: object
        initializers: unknown[]

        constructor({ db, initializers = [] }: any) {
          this.db = db
          this.initializers = initializers
        }
      }

      const db = {}
      container.register({
        db: asValue(db),
        initializers: asValue(undefined),
        repo: asClass(Repo),
      })

      const repo = container.resolve<Repo>('repo')
      assert.strictEqual(repo.db, db)
      assert.deepStrictEqual(repo.initializers, [])
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
      assert.ok(result instanceof MultipleDeps)
      assert.ok(result.testClass instanceof TestClass)
      assert.ok(result.needsCradle instanceof NeedsCradle)
    })

    it('throws an Error when given null', () => {
      const err = throws(() => asClass(null!))
      assert.ok(err instanceof AwilixTypeError)
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
        assert.strictEqual(retVal.lifetime, Lifetime.SCOPED)

        retVal = retVal.transient()
        assert.strictEqual(retVal.lifetime, Lifetime.TRANSIENT)

        retVal = retVal.singleton()
        assert.strictEqual(retVal.lifetime, Lifetime.SINGLETON)

        retVal = retVal.scoped()
        assert.strictEqual(retVal.lifetime, Lifetime.SCOPED)

        const d = (t: TestClass) => {
          return t.dispose()
        }
        retVal = retVal.disposer(d)
        assert.strictEqual(retVal.dispose, d)
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
        assert.notStrictEqual(retVal.injector, undefined)
      })
    })
  })

  describe('aliasTo', () => {
    it('returns the string aliased dependency', () => {
      container.register({ val: asValue(123), aliasVal: aliasTo('val') })
      assert.strictEqual(container.resolve('aliasVal'), 123)
    })

    it('returns the symbol aliased dependency', () => {
      const symbol = Symbol()
      container.register({ [symbol]: asValue(123), aliasVal: aliasTo(symbol) })
      assert.strictEqual(container.resolve('aliasVal'), 123)
    })
  })
})
