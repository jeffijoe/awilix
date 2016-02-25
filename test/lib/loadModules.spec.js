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
  it('calls the default export with the container', function() {
    const container = createContainer();
    const modules = {
      ['standard.js']: spy(),
      ['promise.js']: spy(() => createTimeout()),
      ['default.js']: { default: spy() },
      ['default-promise.js']: { default: spy(() => createTimeout()) }
    };
    const moduleLookupResult = lookupResultFor(modules);
    const deps = {
      container,
      listModules: spy(
        () => Promise.resolve(moduleLookupResult)
      ),
      require: spy(path => modules[path])
    };
    const opts = {};
    return loadModules(deps, 'anything', opts).then(result => {
      result.should.deep.equal({ loadedModules: moduleLookupResult });
      Object.keys(modules).map(x => modules[x]).forEach(m => {
        if (m.default) m = m.default;
        m.should.have.been.calledWith(container);
      });
    });
  });
});