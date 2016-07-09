'use strict';
const nameValueToObject = require('../../lib/nameValueToObject');

describe('nameValueToObject', function() {
  it('converts 2 params to 1', function() {
    const result = nameValueToObject('hello', 'world');
    result.should.be.an.object;
    result.hello.should.equal('world');
  });

  it('uses the object if passed', function() {
    const input = { hello: 'world' };
    const result = nameValueToObject(input);

    result.should.be.an.object;
    result.hello.should.equal('world');
  });
});