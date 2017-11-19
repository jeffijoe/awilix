import { loadModules, LoadModulesOptions } from '../load-modules'
import { createContainer } from '../container'
import { Lifetime } from '../lifetime'
import { ResolutionMode } from '../resolution-mode'
import { asFunction, REGISTRATION, BuildRegistration } from '../registrations'

const lookupResultFor = (modules: any) =>
  Object.keys(modules).map(key => ({
    name: key.replace('.js', ''),
    path: key
  }))

describe('loadModules', function() {
  it('registers loaded modules with the container using the name of the file', function() {
    const container = createContainer()

    class SomeClass {}

    const modules: any = {
      'nope.js': undefined,
      'standard.js': jest.fn(() => 42),
      'default.js': { default: jest.fn(() => 1337) },
      'someClass.js': SomeClass
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }

    const result = loadModules(deps, 'anything')
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    expect(Object.keys(container.registrations).length).toBe(3)
    expect(container.resolve('standard')).toBe(42)
    expect(container.resolve('default')).toBe(1337)
    expect(container.resolve('someClass')).toBeInstanceOf(SomeClass)
  })

  it('uses built-in formatter when given a formatName as a string', function() {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }
    const opts: LoadModulesOptions = {
      formatName: 'camelCase'
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.someClass
    expect(reg).toBeTruthy()
  })

  it('uses the function passed in as formatName', function() {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }
    const opts: LoadModulesOptions = {
      formatName: (name, descriptor) => {
        expect(descriptor.path).toBeTruthy()
        return name + 'IsGreat'
      }
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClassIsGreat
    expect(reg).toBeTruthy()
  })

  it('does nothing with the name if the string formatName does not match a formatter', function() {
    const container = createContainer()
    const modules: any = {
      'SomeClass.js': jest.fn(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }
    const opts: any = {
      formatName: 'unknownformatternope'
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClass
    expect(reg).toBeTruthy()
  })

  it('defaults to transient lifetime if option is unreadable', function() {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }
    const opts = {
      registrationOptions: {}
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).toBeTruthy()
  })

  it('supports passing in a register function', function() {
    const container = createContainer()
    const moduleSpy = jest.fn(() => () => 42)
    const modules: any = {
      'test.js': moduleSpy
    }
    const moduleLookupResult = lookupResultFor(modules)
    const registerSpy = jest.fn(asFunction)
    const deps = {
      container,
      listModules: jest.fn(() => moduleLookupResult),
      require: jest.fn(path => modules[path])
    }
    const regOpts = {
      register: registerSpy,
      lifetime: Lifetime.SCOPED
    }
    const opts = {
      registrationOptions: regOpts
    }
    const result = loadModules(deps, 'anything', opts)
    expect(result).toEqual({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).toBeTruthy()
    expect(registerSpy).toHaveBeenCalledWith(moduleSpy, regOpts)
  })

  it('supports array opts syntax with string (lifetime)', function() {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42)
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        { name: 'test', path: 'test.js', opts: Lifetime.SCOPED },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: jest.fn(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        lifetime: Lifetime.SINGLETON
      }
    })

    expect(container.registrations.test.lifetime).toBe(Lifetime.SCOPED)
    expect(container.registrations.test2.lifetime).toBe(Lifetime.SINGLETON)
  })

  it('supports array opts syntax with object', function() {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42)
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        { name: 'test', path: 'test.js', opts: { lifetime: Lifetime.SCOPED } },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: jest.fn(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        lifetime: Lifetime.SINGLETON
      }
    })

    expect(container.registrations.test.lifetime).toBe(Lifetime.SCOPED)
    expect(container.registrations.test2.lifetime).toBe(Lifetime.SINGLETON)
  })

  it('supports passing in a default resolutionMode', function() {
    const container = createContainer()
    const modules: any = {
      'test.js': jest.fn(() => 42),
      'test2.js': jest.fn(() => 42)
    }

    const deps = {
      container,
      listModules: jest.fn(() => [
        {
          name: 'test',
          path: 'test.js',
          opts: { resolutionMode: ResolutionMode.PROXY }
        },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: jest.fn(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        resolutionMode: ResolutionMode.CLASSIC
      }
    })

    expect(
      (container.registrations.test as BuildRegistration).resolutionMode
    ).toBe(ResolutionMode.PROXY)
    expect(
      (container.registrations.test2 as BuildRegistration).resolutionMode
    ).toBe(ResolutionMode.CLASSIC)
  })

  describe('inline config via REGISTRATION symbol', () => {
    it('uses the inline config over anything else', () => {
      const container = createContainer()
      const test1Func = jest.fn(() => 42)
      ;(test1Func as any)[REGISTRATION] = {
        resolutionMode: ResolutionMode.PROXY
      }

      class Test2Class {}

      ;(Test2Class as any)[REGISTRATION] = {
        lifetime: Lifetime.SCOPED
      }

      const modules: any = {
        'test.js': test1Func,
        'test2.js': Test2Class
      }

      const deps = {
        container,
        listModules: jest.fn(() => [
          { name: 'test', path: 'test.js' },
          { name: 'test2', path: 'test2.js' }
        ]),
        require: jest.fn(path => modules[path])
      }

      loadModules(deps, 'anything', {
        registrationOptions: {
          resolutionMode: ResolutionMode.CLASSIC
        }
      })

      expect(container.registrations.test.lifetime).toBe(Lifetime.TRANSIENT)
      expect(
        (container.registrations.test as BuildRegistration).resolutionMode
      ).toBe(ResolutionMode.PROXY)
      expect(container.registrations.test2.lifetime).toBe(Lifetime.SCOPED)
      expect(
        (container.registrations.test2 as BuildRegistration).resolutionMode
      ).toBe(ResolutionMode.CLASSIC)
    })

    it('allows setting a name to register as', () => {
      const container = createContainer()
      const test1Func = jest.fn(() => 42)
      ;(test1Func as any)[REGISTRATION] = {
        name: 'awesome',
        lifetime: Lifetime.SINGLETON
      }

      const test2Func = jest.fn(() => 42)
      const modules: any = {
        'test.js': test1Func,
        'test2.js': test2Func
      }

      const deps = {
        container,
        listModules: jest.fn(() => [
          { name: 'test', path: 'test.js' },
          { name: 'test2', path: 'test2.js' }
        ]),
        require: jest.fn(path => modules[path])
      }

      loadModules(deps, 'anything', {
        formatName: desc => 'formatNameCalled',
        registrationOptions: {
          lifetime: Lifetime.SCOPED
        }
      })

      expect(container.registrations.awesome.lifetime).toBe(Lifetime.SINGLETON)
      expect(container.registrations.formatNameCalled.lifetime).toBe(
        Lifetime.SCOPED
      )
    })
  })
})
