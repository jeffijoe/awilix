'use strict';
const awilix = require('../../lib/awilix');
const createContainer = require('../../lib/createContainer');
const listModules = require('../../lib/listModules');
const AwilixResolutionError = require('../../lib/AwilixResolutionError');

describe('awilix', function() {
  it('exists', function() {
    expect(awilix).to.exist;
  });

  it('has a createContainer function', function() {
    awilix.should.have.property('createContainer');
    awilix.createContainer.should.equal(createContainer);
  });

  it('has a listModules function', function() {
    awilix.should.have.property('listModules');
    awilix.listModules.should.equal(listModules);
  });

  it('has an AwilixResolutionError function', function() {
    awilix.should.have.property('AwilixResolutionError');
    awilix.AwilixResolutionError.should.equal(AwilixResolutionError);
  });
});