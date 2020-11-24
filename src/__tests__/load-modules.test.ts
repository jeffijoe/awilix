import { loadModules, LoadModulesOptions } from '../load-modules'
import { createContainer } from '../container'
import { Lifetime } from '../lifetime'
import { InjectionMode } from '../injection-mode'
import { asFunction, RESOLVER, BuildResolver, asValue } from '../resolvers'

const lookupResultFor = (modules: any) =>
  Object.keys(modules).map((key) => ({
    name: key.replace('.js', ''),
    path: key,
    opts: null,
  }))

describe('loadModules', function () {
  it('registers loaded modules with the container using the name of the file', function () {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nope.js': undefined,
      'standard.js': jest.fn(() => 42),
      'default.js': { default: jest.fn(() => 1337) },
      'someClass.js': SomeClass,
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(3)
    expect(container.resolve('standard')).toBe(42)
    expect(container.resolve('default')).toBe(1337)
    expect(container.resolve('someClass')).toBeInstanceOf(SomeClass)
  })

  it('registers loaded modules async when using native modules', async function () {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nope.js': undefined,
      'standard.js': jest.fn(() => 42),
      'default.js': { default: jest.fn(() => 1337) },
      'someClass.js': SomeClass,
    }

    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(async (path) => modules[path]),
    }

    const result = await loadModules(deps, 'anything', { esModules: true })
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(3)
    expect(container.resolve('standard')).toBe(42)
    expect(container.resolve('default')).toBe(1337)
    expect(container.resolve('someClass')).toBeInstanceOf(SomeClass)
  })

  it('registers non-default export modules containing RESOLVER token with the container', function () {
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
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(1)
    // Note the capital first letter because the export key name is used instead of the filename
    expect(container.resolve('SomeNonDefaultClass')).toBeInstanceOf(
      SomeNonDefaultClass
    )
  })

  it('does not register non-default modules without a RESOLVER token', function () {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nopeClass.js': { SomeClass },
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(0)
  })

  it('registers multiple loaded modules from one file with the container', function () {
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
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(3)
    expect(container.resolve('mixedFile')).toBeInstanceOf(SomeClass)
    expect(container.resolve('nonDefault')).toBeInstanceOf(SomeNonDefaultClass)
    expect(container.resolve('nameOverride')).toBeInstanceOf(
      SomeNamedNonDefaultClass
    )
  })

  it('registers only the last module with a certain name with the container', function () {
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
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(2)
    expect(container.resolve('mixedFileOne')).toBeInstanceOf(
      SomeNonDefaultClass
    )
    expect(container.resolve('nameOverride')).toBeInstanceOf(
      SomeNamedNonDefaultClass
    )
  })

  it('uses built-in formatter when given a formatName as a string', function () {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }
    const opts: LoadModulesOptions = {
      formatName: 'camelCase',
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.someClass
    expect(reg).toBeTruthy()
  })

  it('uses the function passed in as formatName', function () {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }
    const opts: LoadModulesOptions = {
      formatName: (name, descriptor) => {
        expect(descriptor.path).toBeTruthy()
        return name + 'IsGreat'
      },
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClassIsGreat
    expect(reg).toBeTruthy()
  })

  it('does nothing with the name if the string formatName does not match a formatter', function () {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }
    const opts: any = {
      formatName: 'unknownformatternope',
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClass
    expect(reg).toBeTruthy()
  })

  it('defaults to transient lifetime if option is unreadable', function () {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }
    const opts = {
      resolverOptions: {},
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).toBeTruthy()
  })

  it('supports passing in a register function', function () {
    const container = createContainer()
    const moduleSpy = jest.fn(() => () => 42)
    const modules: any = {
      'test.js': moduleSpy,
    }
    const moduleLookupResult = lookupResultFor(modules)
    const registerSpy = jest.fn(asFunction)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn((path) => modules[path]),
    }
    const regOpts = {
      register: registerSpy,
      lifetime: Lifetime.SCOPED,
    }
    const opts = {
      resolverOptions: regOpts,
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).toBeTruthy()
    expect(registerSpy).toHaveBeenCalledWith(moduleSpy, regOpts)
  })

  it('supports array opts syntax with string (lifetime)', function () {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42),
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        { name: 'test', path: 'test.js', opts: Lifetime.SCOPED },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: jest.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        lifetime: Lifetime.SINGLETON,
      },
    })

    expect(container.registrations.test.lifetime).toBe(Lifetime.SCOPED)
    expect(container.registrations.test2.lifetime).toBe(Lifetime.SINGLETON)
  })

  it('supports array opts syntax with object', function () {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42),
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        { name: 'test', path: 'test.js', opts: { lifetime: Lifetime.SCOPED } },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: jest.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        lifetime: Lifetime.SINGLETON,
      },
    })

    expect(container.registrations.test.lifetime).toBe(Lifetime.SCOPED)
    expect(container.registrations.test2.lifetime).toBe(Lifetime.SINGLETON)
  })

  it('supports passing in a default injectionMode', function () {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42),
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        {
          name: 'test',
          path: 'test.js',
          opts: { injectionMode: InjectionMode.PROXY },
        },
        { name: 'test2', path: 'test2.js', opts: null },
      ]),
      require: jest.fn((path) => modules[path]),
    }

    loadModules(deps, 'anything', {
      resolverOptions: {
        injectionMode: InjectionMode.CLASSIC,
      },
    })

    expect(
      (container.registrations.test as BuildResolver<any>).injectionMode
    ).toBe(InjectionMode.PROXY)
    expect(
      (container.registrations.test2 as BuildResolver<any>).injectionMode
    ).toBe(InjectionMode.CLASSIC)
  })

  describe('inline config via REGISTRATION symbol', () => {
    it('uses the inline config over anything else', () => {
      const container = createContainer()
      const test1Func = jest.fn(() => 42)
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
        listModules: jest.fn(() => [
          { name: 'test', path: 'test.js', opts: null },
          { name: 'test2', path: 'test2.js', opts: null },
          { name: 'test3', path: 'test3.js', opts: null },
        ]),
        require: jest.fn((path) => modules[path]),
      }

      loadModules(deps, 'anything', {
        resolverOptions: {
          injectionMode: InjectionMode.CLASSIC,
        },
      })

      expect(container.registrations.test.lifetime).toBe(Lifetime.TRANSIENT)
      expect(
        (container.registrations.test as BuildResolver<any>).injectionMode
      ).toBe(InjectionMode.PROXY)
      expect(container.registrations.test2.lifetime).toBe(Lifetime.SCOPED)
      expect(
        (container.registrations.test2 as BuildResolver<any>).injectionMode
      ).toBe(InjectionMode.CLASSIC)
      expect(container.resolve('test3')).toBe(Test3Class)
    })

    it('allows setting a name to register as', () => {
      const container = createContainer()
      const test1Func = jest.fn(() => 42)
      ;(test1Func as any)[RESOLVER] = {
        name: 'awesome',
        lifetime: Lifetime.SINGLETON,
      }

      const test2Func = jest.fn(() => 42)
      const modules: any = {
        'test.js': test1Func,
        'test2.js': test2Func,
      }

      const deps = {
        container,
        listModules: jest.fn(() => [
          { name: 'test', path: 'test.js', opts: null },
          { name: 'test2', path: 'test2.js', opts: null },
        ]),
        require: jest.fn((path) => modules[path]),
      }

      loadModules(deps, 'anything', {
        formatName: (desc) => 'formatNameCalled',
        resolverOptions: {
          lifetime: Lifetime.SCOPED,
        },
      })

      expect(container.registrations.awesome.lifetime).toBe(Lifetime.SINGLETON)
      expect(container.registrations.formatNameCalled.lifetime).toBe(
        Lifetime.SCOPED
      )
    })
  })
})
