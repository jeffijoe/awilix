const loadModules = require('../../lib/loadModules')
const spy = sinon.spy
const createContainer = require('../../lib/createContainer')
const Lifetime = require('../../lib/Lifetime')
const ResolutionMode = require('../../lib/ResolutionMode')
const { asFunction, REGISTRATION } = require('../../lib/registrations')

const lookupResultFor = modules =>
  Object.keys(modules).map(key => ({
    name: key.replace('.js', ''),
    path: key
  }))

describe('loadModules', function() {
  it('registers loaded modules with the container using the name of the file', function() {
    const container = createContainer()

    class SomeClass {}

    const modules = {
      'nope.js': undefined,
      'standard.js': spy(() => 42),
      'default.js': { default: spy(() => 1337) },
      'someClass.js': SomeClass
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }

    const result = loadModules(deps, 'anything')
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    Object.keys(container.registrations).length.should.equal(3)
    container.resolve('standard').should.equal(42)
    container.resolve('default').should.equal(1337)
    container.resolve('someClass').should.be.an.instanceOf(SomeClass)
  })

  it('uses built-in formatter when given a formatName as a string', function() {
    const container = createContainer()
    const modules = {
      'SomeClass.js': spy(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }
    const opts = {
      formatName: 'camelCase'
    }
    const result = loadModules(deps, 'anything', opts)
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    const reg = container.registrations.someClass
    expect(reg).to.be.ok
  })

  it('uses the function passed in as formatName', function() {
    const container = createContainer()
    const modules = {
      'SomeClass.js': spy(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }
    const opts = {
      formatName: (name, descriptor) => {
        expect(descriptor.path).to.be.ok
        return name + 'IsGreat'
      }
    }
    const result = loadModules(deps, 'anything', opts)
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClassIsGreat
    expect(reg).to.be.ok
  })

  it('does nothing with the name if the string formatName does not match a formatter', function() {
    const container = createContainer()
    const modules = {
      'SomeClass.js': spy(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }
    const opts = {
      formatName: 'unknownformatternope'
    }
    const result = loadModules(deps, 'anything', opts)
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    const reg = container.registrations.SomeClass
    expect(reg).to.be.ok
  })

  it('defaults to transient lifetime if option is unreadable', function() {
    const container = createContainer()
    const modules = {
      'test.js': spy(() => 42)
    }
    const moduleLookupResult = lookupResultFor(modules)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }
    const opts = {
      registrationOptions: {}
    }
    const result = loadModules(deps, 'anything', opts)
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).to.be.ok
  })

  it('supports passing in a register function', function() {
    const container = createContainer()
    const moduleSpy = spy(() => () => 42)
    const modules = {
      'test.js': moduleSpy
    }
    const moduleLookupResult = lookupResultFor(modules)
    const registerSpy = spy(asFunction)
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    }
    const regOpts = {
      register: registerSpy,
      lifetime: Lifetime.SCOPED
    }
    const opts = {
      registrationOptions: regOpts
    }
    const result = loadModules(deps, 'anything', opts)
    result.should.deep.equal({ loadedModules: moduleLookupResult })
    const reg = container.registrations.test
    expect(reg).to.be.ok
    expect(registerSpy).to.have.been.calledWith(moduleSpy, regOpts)
  })

  it('supports array opts syntax with string (lifetime)', function() {
    const container = createContainer()
    const modules = {
      'test.js': spy(() => 42),
      'test2.js': spy(() => 42)
    }

    const deps = {
      container,
      listModules: spy(() => [
        { name: 'test', path: 'test.js', opts: Lifetime.SCOPED },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: spy(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        lifetime: Lifetime.SINGLETON
      }
    })

    container.registrations.test.lifetime.should.equal(Lifetime.SCOPED)
    container.registrations.test2.lifetime.should.equal(Lifetime.SINGLETON)
  })

  it('supports array opts syntax with object', function() {
    const container = createContainer()
    const modules = {
      'test.js': spy(() => 42),
      'test2.js': spy(() => 42)
    }

    const deps = {
      container,
      listModules: spy(() => [
        { name: 'test', path: 'test.js', opts: { lifetime: Lifetime.SCOPED } },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: spy(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        lifetime: Lifetime.SINGLETON
      }
    })

    container.registrations.test.lifetime.should.equal(Lifetime.SCOPED)
    container.registrations.test2.lifetime.should.equal(Lifetime.SINGLETON)
  })

  it('supports passing in a default resolutionMode', function() {
    const container = createContainer()
    const modules = {
      'test.js': spy(() => 42),
      'test2.js': spy(() => 42)
    }

    const deps = {
      container,
      listModules: spy(() => [
        {
          name: 'test',
          path: 'test.js',
          opts: { resolutionMode: ResolutionMode.PROXY }
        },
        { name: 'test2', path: 'test2.js' }
      ]),
      require: spy(path => modules[path])
    }

    loadModules(deps, 'anything', {
      registrationOptions: {
        resolutionMode: ResolutionMode.CLASSIC
      }
    })

    container.registrations.test.resolutionMode.should.equal(
      ResolutionMode.PROXY
    )
    container.registrations.test2.resolutionMode.should.equal(
      ResolutionMode.CLASSIC
    )
  })

  describe('inline config via REGISTRATION symbol', () => {
    it('uses the inline config over anything else', () => {
      const container = createContainer()
      const test1Func = spy(() => 42)
      test1Func[REGISTRATION] = {
        resolutionMode: ResolutionMode.PROXY
      }

      class Test2Class {}

      Test2Class[REGISTRATION] = {
        lifetime: Lifetime.SCOPED
      }

      const modules = {
        'test.js': test1Func,
        'test2.js': Test2Class
      }

      const deps = {
        container,
        listModules: spy(() => [
          { name: 'test', path: 'test.js' },
          { name: 'test2', path: 'test2.js' }
        ]),
        require: spy(path => modules[path])
      }

      loadModules(deps, 'anything', {
        registrationOptions: {
          resolutionMode: ResolutionMode.CLASSIC
        }
      })

      container.registrations.test.lifetime.should.equal(Lifetime.TRANSIENT)
      container.registrations.test.resolutionMode.should.equal(
        ResolutionMode.PROXY
      )
      container.registrations.test2.lifetime.should.equal(Lifetime.SCOPED)
      container.registrations.test2.resolutionMode.should.equal(
        ResolutionMode.CLASSIC
      )
    })

    it('allows setting a name to register as', () => {
      const container = createContainer()
      const test1Func = spy(() => 42)
      test1Func[REGISTRATION] = {
        name: 'awesome',
        lifetime: Lifetime.SINGLETON
      }

      const test2Func = spy(() => 42)
      const modules = {
        'test.js': test1Func,
        'test2.js': test2Func
      }

      const deps = {
        container,
        listModules: spy(() => [
          { name: 'test', path: 'test.js' },
          { name: 'test2', path: 'test2.js' }
        ]),
        require: spy(path => modules[path])
      }

      loadModules(deps, 'anything', {
        formatName: desc => 'formatNameCalled',
        registrationOptions: {
          lifetime: Lifetime.SCOPED
        }
      })

      container.registrations.awesome.lifetime.should.equal(Lifetime.SINGLETON)
      container.registrations.formatNameCalled.lifetime.should.equal(
        Lifetime.SCOPED
      )
    })
  })
})
