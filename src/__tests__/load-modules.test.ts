import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as path from 'path'
import { type LoadModulesOptions, loadModules } from '../load-modules.ts'
import { createContainer } from '../container.ts'
import { Lifetime } from '../lifetime.ts'
import { InjectionMode } from '../injection-mode.ts'
import {
  type BuildResolver,
  asFunction,
  RESOLVER,
  asValue,
} from '../resolvers.ts'

const lookupResultFor = (modules: any) =>
  Object.keys(modules).map((key) => ({
    name: key.replace('.js', ''),
    path: key,
    opts: null,
  }))

describe('loadModules', () => {
  it('registers loaded modules with the container using the name of the file', (t) => {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nope.js': undefined,
      'standard.js': t.mock.fn(() => 42),
      'default.js': { default: t.mock.fn(() => 1337) },
      'someClass.js': SomeClass,
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 3)
    assert.strictEqual(container.resolve('standard'), 42)
    assert.strictEqual(container.resolve('default'), 1337)
    assert.ok(container.resolve('someClass') instanceof SomeClass)
  })

  it('registers loaded modules async when using native modules', async (t) => {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nope.js': undefined,
      'standard.js': t.mock.fn(() => 42),
      'default.js': { default: t.mock.fn(() => 1337) },
      'someClass.js': SomeClass,
    }

    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn(async (p) => modules[path.parse(p).base]),
    }

    const result = await loadModules(deps, 'anything', { esModules: true })
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 3)
    assert.strictEqual(container.resolve('standard'), 42)
    assert.strictEqual(container.resolve('default'), 1337)
    assert.ok(container.resolve('someClass') instanceof SomeClass)
  })

  it('registers non-default export modules containing RESOLVER token with the container', (t) => {
    const container = createContainer()

    class SomeNonDefaultClass {
      static [RESOLVER] = {}
    }

    const modules: any = {
      'someIgnoredName.js': { SomeNonDefaultClass },
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 1)
    // Note the capital first letter because the export key name is used instead of the filename
    assert.ok(
      container.resolve('SomeNonDefaultClass') instanceof SomeNonDefaultClass,
    )
  })

  it('does not register non-default modules without a RESOLVER token', (t) => {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nopeClass.js': { SomeClass },
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 0)
  })

  it('registers multiple loaded modules from one file with the container', (t) => {
    const container = createContainer()

    class SomeClass {}
    class SomeNonDefaultClass {
      static [RESOLVER] = {}
    }
    class SomeNamedNonDefaultClass {
      static [RESOLVER] = {
        name: 'nameOverride',
      }
    }

    const modules: any = {
      'mixedFile.js': {
        default: SomeClass,
        nonDefault: SomeNonDefaultClass,
        namedNonDefault: SomeNamedNonDefaultClass,
      },
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 3)
    assert.ok(container.resolve('mixedFile') instanceof SomeClass)
    assert.ok(container.resolve('nonDefault') instanceof SomeNonDefaultClass)
    assert.ok(
      container.resolve('nameOverride') instanceof SomeNamedNonDefaultClass,
    )
  })

  it('registers only the last module with a certain name with the container', (t) => {
    const container = createContainer()

    class SomeClass {}
    class SomeNonDefaultClass {
      static [RESOLVER] = {}
    }
    class SomeNamedNonDefaultClass {
      static [RESOLVER] = {
        name: 'nameOverride',
      }
    }

    const modules: any = {
      'mixedFileOne.js': {
        default: SomeClass,
        nameOverride: SomeNonDefaultClass,
        // this will override the above named export with its specified name
        namedNonDefault: SomeNamedNonDefaultClass,
      },
      'mixedFileTwo.js': {
        // this will override the default export from mixedFileOne
        mixedFileOne: SomeNonDefaultClass,
      },
    }

    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    assert.strictEqual(Object.keys(container.registrations).length, 2)
    assert.ok(container.resolve('mixedFileOne') instanceof SomeNonDefaultClass)
    assert.ok(
      container.resolve('nameOverride') instanceof SomeNamedNonDefaultClass,
    )
  })

  it('uses built-in formatter when given a formatName as a string', (t) => {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': t.mock.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }
    const opts: LoadModulesOptions = {
      formatName: 'camelCase',
    }
    const result = loadModules(deps, 'anything', opts)
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    const reg = container.registrations.someClass
    assert.ok(reg)
  })

  it('uses the function passed in as formatName', (t) => {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': t.mock.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }
    const opts: LoadModulesOptions = {
      formatName: (name, descriptor) => {
        assert.ok(descriptor.path)
        return name + 'IsGreat'
      },
    }
    const result = loadModules(deps, 'anything', opts)
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClassIsGreat
    assert.ok(reg)
  })

  it('does nothing with the name if the string formatName does not match a formatter', (t) => {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': t.mock.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }
    const opts: any = {
      formatName: 'unknownformatternope',
    }
    const result = loadModules(deps, 'anything', opts)
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClass
    assert.ok(reg)
  })

  it('defaults to transient lifetime if option is unreadable', (t) => {
    const container = createContainer()
    const modules: any = {
      'test.js': t.mock.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }
    const opts = {
      resolverOptions: {},
    }
    const result = loadModules(deps, 'anything', opts)
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    assert.ok(reg)
  })

  it('supports passing in a register function', (t) => {
    const container = createContainer()
    const moduleSpy = t.mock.fn(() => () => 42)
    const modules: any = {
      'test.js': moduleSpy,
    }
    const moduleLookupResult = lookupResultFor(modules)
    const registerSpy = t.mock.fn(asFunction)
    const deps = {
      container,
      listModules: t.mock.fn(() => moduleLookupResult),
      require: t.mock.fn((path) => modules[path]),
    }
    const regOpts = {
      register: registerSpy,
      lifetime: Lifetime.SCOPED,
    }
    const opts = {
      resolverOptions: regOpts,
    }
    const result = loadModules(deps, 'anything', opts)
    assert.deepStrictEqual(result, { loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    assert.ok(reg)
    assert.deepStrictEqual(
      registerSpy.mock.calls.map((call) => call.arguments),
      [[moduleSpy, regOpts]],
    )
  })

  it('supports array opts syntax with string (lifetime)', (t) => {
    const container = createContainer()
    const modules: any = {
      'test.js': t.mock.fn(() => 42),
      'test2.js': t.mock.fn(() => 42),
    }

    const deps = {
      container,
      listModules: t.mock.fn(() => [
        { name: 'test', path: 'test.js', opts: Lifetime.SCOPED },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: t.mock.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        lifetime: Lifetime.SINGLETON,
      },
    })

    assert.strictEqual(container.registrations.test.lifetime, Lifetime.SCOPED)
    assert.strictEqual(
      container.registrations.test2.lifetime,
      Lifetime.SINGLETON,
    )
  })

  it('supports array opts syntax with object', (t) => {
    const container = createContainer()
    const modules: any = {
      'test.js': t.mock.fn(() => 42),
      'test2.js': t.mock.fn(() => 42),
    }

    const deps = {
      container,
      listModules: t.mock.fn(() => [
        { name: 'test', path: 'test.js', opts: { lifetime: Lifetime.SCOPED } },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: t.mock.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        lifetime: Lifetime.SINGLETON,
      },
    })

    assert.strictEqual(container.registrations.test.lifetime, Lifetime.SCOPED)
    assert.strictEqual(
      container.registrations.test2.lifetime,
      Lifetime.SINGLETON,
    )
  })

  it('supports passing in a default injectionMode', (t) => {
    const container = createContainer()
    const modules: any = {
      'test.js': t.mock.fn(() => 42),
      'test2.js': t.mock.fn(() => 42),
    }

    const deps = {
      container,
      listModules: t.mock.fn(() => [
        {
          name: 'test',
          path: 'test.js',
          opts: { injectionMode: InjectionMode.PROXY },
        },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: t.mock.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        injectionMode: InjectionMode.CLASSIC,
      },
    })

    assert.strictEqual(
      (container.registrations.test as BuildResolver<any>).injectionMode,
      InjectionMode.PROXY,
    )
    assert.strictEqual(
      (container.registrations.test2 as BuildResolver<any>).injectionMode,
      InjectionMode.CLASSIC,
    )
  })

  describe('inline config via REGISTRATION symbol', () => {
    it('uses the inline config over anything else', (t) => {
      const container = createContainer()
      const test1Func = t.mock.fn(() => 42)
      ;(test1Func as any)[RESOLVER] = {
        injectionMode: InjectionMode.PROXY,
      }

      class Test2Class {}

      ;(Test2Class as any)[RESOLVER] = {
        lifetime: Lifetime.SCOPED,
      }

      class Test3Class {}

      ;(Test3Class as any)[RESOLVER] = {
        register: asValue,
      }

      const modules: any = {
        'test.js': test1Func,
        'test2.js': Test2Class,
        'test3.js': Test3Class,
      }

      const deps = {
        container,
        listModules: t.mock.fn(() => [
          { name: 'test', path: 'test.js', opts: null },
          { name: 'test2', path: 'test2.js', opts: null },
          { name: 'test3', path: 'test3.js', opts: null },
        ]),
        require: t.mock.fn((path) => modules[path]),
      }

      loadModules(deps, 'anything', {
        resolverOptions: {
          injectionMode: InjectionMode.CLASSIC,
        },
      })

      assert.strictEqual(
        container.registrations.test.lifetime,
        Lifetime.TRANSIENT,
      )
      assert.strictEqual(
        (container.registrations.test as BuildResolver<any>).injectionMode,
        InjectionMode.PROXY,
      )
      assert.strictEqual(
        container.registrations.test2.lifetime,
        Lifetime.SCOPED,
      )
      assert.strictEqual(
        (container.registrations.test2 as BuildResolver<any>).injectionMode,
        InjectionMode.CLASSIC,
      )
      assert.strictEqual(container.resolve('test3'), Test3Class)
    })

    it('allows setting a name to register as', (t) => {
      const container = createContainer()
      const test1Func = t.mock.fn(() => 42)
      ;(test1Func as any)[RESOLVER] = {
        name: 'awesome',
        lifetime: Lifetime.SINGLETON,
      }

      const test2Func = t.mock.fn(() => 42)
      const modules: any = {
        'test.js': test1Func,
        'test2.js': test2Func,
      }

      const deps = {
        container,
        listModules: t.mock.fn(() => [
          { name: 'test', path: 'test.js', opts: null },
          { name: 'test2', path: 'test2.js', opts: null },
        ]),
        require: t.mock.fn((path) => modules[path]),
      }

      loadModules(deps, 'anything', {
        formatName: () => 'formatNameCalled',
        resolverOptions: {
          lifetime: Lifetime.SCOPED,
        },
      })

      assert.strictEqual(
        container.registrations.awesome.lifetime,
        Lifetime.SINGLETON,
      )
      assert.strictEqual(
        container.registrations.formatNameCalled.lifetime,
        Lifetime.SCOPED,
      )
    })
  })
})
