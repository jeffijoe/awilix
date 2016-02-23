'use strict';

const listModules = require('../../lib/listModules');

describe('listModules', function() {
  it('can find the modules in lib', function() {
    return listModules('../../lib/*.js', { cwd: __dirname }).then(result => {
      result.should.satisfy(
        arr => arr.some(x => x.name === 'createContainer')
      );
    });
  });

  it('can find the modules in lib without cwd', function() {
    return listModules('lib/*.js').then(result => {
      result.should.satisfy(
        arr => arr.some(x => x.name === 'createContainer')
      );
    });
  });

  it('handles dots in module names', function() {
    return listModules('*.js', { cwd: __dirname }).then(result => {
      const createContainerSpec = result.find(x => x.name === 'createContainer.spec');
      createContainerSpec.name.should.equal('createContainer.spec');
    });
  });

  it('returns a path', function() {
    return listModules('../../lib/*.js', { cwd: __dirname }).then(result => {
      const createContainerModule = result.find(x => x.name === 'createContainer');
      createContainerModule.name.should.equal('createContainer');
      createContainerModule.path.should.contain('createContainer.js');
    });
  });

  it('supports an array of globs', function() {
    return listModules(['lib/*.js', 'test/*.js']).then(result => {
      const createContainerModule = result.find(x => x.name === 'createContainer');
      createContainerModule.name.should.equal('createContainer');
      createContainerModule.path.should.contain('createContainer.js');

      const createContainerSpec = result.find(x => x.name === 'createContainer');
      createContainerSpec.name.should.equal('createContainer');
      createContainerSpec.path.should.contain('createContainer.js');
    });
  });
});