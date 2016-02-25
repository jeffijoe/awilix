'use strict';
const awilix = require('../../lib/awilix');
const createContainer = require('../../lib/createContainer');
const AwilixResolutionError = require('../../lib/AwilixResolutionError');

describe('awilix', function() {
  it('exists', function() {
    expect(awilix).to.exist;
  });

  it('has a createContainer function', function() {
    awilix.should.have.property('createContainer');
    awilix.createContainer.should.equal(createContainer);
  });

  it('has an AwilixResolutionError function', function() {
    awilix.should.have.property('AwilixResolutionError');
    awilix.AwilixResolutionError.should.equal(AwilixResolutionError);
  });
});