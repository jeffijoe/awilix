'use strict';
const loadModules = require('../../lib/loadModules');
const spy = sinon.spy;

const createTimeout = () => new Promise(resolve => setTimeout(resolve, 1));

describe('loadModules', function() {
  it('calls the default export with the container', function() {
    const modules = {
      ['standard.js']: spy(),
      ['promise.js']: spy(() => createTimeout()),
      ['default.js']: { default: spy() },
      ['default-promise.js']: { default: spy(() => createTimeout()) }
    };
    const container = {

    };
    const deps = {
      container,
      listModules: spy(
        () => Promise.resolve(
          Object.keys(modules).map(key => ({
            name: key.replace('.js', ''),
            path: key
          }))
        )
      ),
      require: spy(path => modules[path])
    };
    const opts = {};
    return loadModules(deps, 'anything', opts).then(result => {
      result.should.equal(container);
      Object.keys(modules).map(x => modules[x]).forEach(m => {
        if (m.default) m = m.default;
        m.should.have.been.calledWith(container);
      });
    });
  });
});