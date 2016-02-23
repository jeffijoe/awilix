'use strict';
const awilix = require('../../lib/awilix');

describe('awilix', function() {
  it('exists', function() {
    expect(awilix).to.exist;
  });

  it('has a createContainer function', function() {
    awilix.should.have.property('createContainer');
  });
});