'use strict';
const dependencyToken = require('../../lib/dependencyToken');
const spy = sinon.spy;

describe('dependencyToken', function() {
  it('throws when args are missing', function() {
    expect(() => dependencyToken()).to.throw(/Options object/);
    expect(() => dependencyToken({})).to.throw(/dependencies/);
    expect(() => dependencyToken({ dependencies: []})).to.throw(/callback/);
  });

  describe('canBeResolved', function() {
    it('should be true when all given dependencies are in the token\'s dependencies', function() {
      const token = dependencyToken({
        dependencies: ['thing1', 'thing2'],
        callback: spy
      });

      token.canBeResolved(['thing1', 'thing2']).should.be.true;
      token.canBeResolved(['thing1', 'thing2', 'thing3']).should.be.true;
    });

    it('should be true when none/some of given dependencies are in the token\'s dependencies', function() {
      const token = dependencyToken({
        dependencies: ['thing1', 'thing2'],
        callback: spy
      });

      token.canBeResolved(['thing1']).should.be.false;
      token.canBeResolved(['thing2', 'thing3']).should.be.false;
      token.canBeResolved([]).should.be.false;
    });
  });
});