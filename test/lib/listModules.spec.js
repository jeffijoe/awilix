'use strict';

const listModules = require('../../lib/listModules');

describe('listModules', function() {
  it('can find the modules in lib', function() {
    const result = listModules('../../lib/*.js', { cwd: __dirname });
    result.should.satisfy(
      arr => arr.some(x => x.name === 'createContainer')
    );
  });

  it('can find the modules in lib without cwd', function() {
    const result = listModules('lib/*.js');
    result.should.satisfy(
      arr => arr.some(x => x.name === 'createContainer')
    );
  });

  it('handles dots in module names', function() {
    const result = listModules('*.js', { cwd: __dirname });
    const createContainerSpec = result.find(x => x.name === 'createContainer.spec');
    createContainerSpec.name.should.equal('createContainer.spec');
  });

  it('returns a path', function() {
    const result = listModules('../../lib/*.js', { cwd: __dirname });
    const createContainerModule = result.find(x => x.name === 'createContainer');
    createContainerModule.name.should.equal('createContainer');
    createContainerModule.path.should.contain('createContainer.js');
  });

  it('supports an array of globs', function() {
    const result = listModules(['lib/*.js', 'test/*.js']);
    const createContainerModule = result.find(x => x.name === 'createContainer');
    createContainerModule.name.should.equal('createContainer');
    createContainerModule.path.should.contain('createContainer.js');

    const createContainerSpec = result.find(x => x.name === 'createContainer');
    createContainerSpec.name.should.equal('createContainer');
    createContainerSpec.path.should.contain('createContainer.js');
  });
});