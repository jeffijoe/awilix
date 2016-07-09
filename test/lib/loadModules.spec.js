'use strict';
const loadModules = require('../../lib/loadModules');
const spy = sinon.spy;
const createContainer = require('../../lib/createContainer');

const createTimeout = () => new Promise(resolve => setTimeout(resolve, 1));

const lookupResultFor = modules => Object.keys(modules).map(key => ({
  name: key.replace('.js', ''),
  path: key
}));

describe('loadModules', function() {
  it('registers loaded modules with the container using the name of the file', function() {
    const container = createContainer();

    class SomeClass {}

    const modules = {
      ['nope.js']: undefined,
      ['standard.js']: spy(() => 42),
      ['default.js']: { default: spy(() => 1337) },
      ['someClass.js']: SomeClass
    };
    const moduleLookupResult = lookupResultFor(modules);
    const deps = {
      container,
      listModules: spy(() => moduleLookupResult),
      require: spy(path => modules[path])
    };

    const result = loadModules(deps, 'anything');
    result.should.deep.equal({ loadedModules: moduleLookupResult });
    Object.keys(container.registrations).length.should.equal(3);
    container.resolve('standard').should.equal(42);
    container.resolve('default').should.equal(1337);
    container.resolve('someClass').should.be.an.instanceOf(SomeClass);
  });

  it('uses built-in formatter when given a formatName as a string', function() {
    const container = createContainer();
    const modules = {
      ['SomeClass.js']: spy(() => 42)
    };
    const moduleLookupResult = lookupResultFor(modules);
    const deps = {
      container,
      listModules: spy(
        () => moduleLookupResult
      ),
      require: spy(path => modules[path])
    };
    const opts = {
      formatName: 'camelCase'
    };
    const result = loadModules(deps, 'anything', opts);
    result.should.deep.equal({ loadedModules: moduleLookupResult });
    const reg = container.registrations.someClass;
    expect(reg).to.be.ok;
  });

  it('uses the function passed in as formatName', function() {
    const container = createContainer();
    const modules = {
      ['SomeClass.js']: spy(() => 42)
    };
    const moduleLookupResult = lookupResultFor(modules);
    const deps = {
      container,
      listModules: spy(
        () => moduleLookupResult
      ),
      require: spy(path => modules[path])
    };
    const opts = {
      formatName: name => name + 'IsGreat'
    };
    const result = loadModules(deps, 'anything', opts);
    result.should.deep.equal({ loadedModules: moduleLookupResult });
    const reg = container.registrations.SomeClassIsGreat;
    expect(reg).to.be.ok;
  });

  it('does nothing with the name if the string formatName does not match a formatter', function() {
    const container = createContainer();
    const modules = {
      ['SomeClass.js']: spy(() => 42)
    };
    const moduleLookupResult = lookupResultFor(modules);
    const deps = {
      container,
      listModules: spy(
        () => moduleLookupResult
      ),
      require: spy(path => modules[path])
    };
    const opts = {
      formatName: 'unknownformatternope'
    };
    const result = loadModules(deps, 'anything', opts);
    result.should.deep.equal({ loadedModules: moduleLookupResult });
    const reg = container.registrations.SomeClass;
    expect(reg).to.be.ok;
  });
});