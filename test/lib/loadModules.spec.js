'use strict';
const loadModules = require('../../lib/loadModules');
const spy = sinon.spy;

describe('loadModules', function() {
  it('calls the default export with the container', function() {
    const modules = {
      ['m1.js']: spy(),
      ['m2.js']: spy()
    };
    const container = {

    };
    const deps = {
      container,
      listModules: spy(
        () => Promise.resolve(
          [
            { name: 'm1', path: 'm1.js'},
            { name: 'm2', path: 'm2.js'}
          ]
        )
      ),
      require: spy(path => modules[path])
    };
    const opts = {};
    return loadModules(deps, 'anything', opts).then(result => {
      result.should.equal(container);
    });
  });
});