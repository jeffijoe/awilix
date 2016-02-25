'use strict';

const resolveTokens = require('../../lib/resolveTokens');
const dependencyToken = require('../../lib/dependencyToken');
const spy = sinon.spy;
const AwilixResolutionError = require('../../lib/AwilixResolutionError');

describe('resolveTokens', function() {
  it('should fulfill a promise when tokens have been resolved', function() {
    const _tokens = [
      dependencyToken({
        dependencies: ['thing1', 'thing2'],
        callback: spy(c => {
          c.main = { thing1: c.thing1, thing2: c.thing2 };
        })
      }),
      dependencyToken({
        dependencies: ['thing2'],
        callback: spy(c => {
          c.thing1 = { thing2: c.thing2 };
        })
      })
    ];
    const container = {
      thing2: 'thing 2',
      _getDependencyTokens: spy(() => _tokens)
    };

    return resolveTokens(container).then(() => {
      _tokens[0].callback.should.have.been.calledOnce.calledWith(container);
      _tokens[1].callback.should.have.been.calledOnce.calledWith(container);
      expect(container.thing1).to.exist;
      expect(container.main).to.exist;

      container.thing1.thing2.should.equal(container.thing2);
      container.main.thing1.should.equal(container.thing1);
      container.main.thing2.should.equal(container.thing2);
    });
  });

  it('should throw when there are missing dependencies', function() {
    const _tokens = [
      dependencyToken({
        dependencies: ['thing1', 'thing2'],
        callback: spy(c => {
          c.main = { thing1: c.thing1, thing2: c.thing2 };
        })
      }),
      dependencyToken({
        dependencies: ['thing2'],
        callback: spy(c => {
          c.thing1 = { thing2: c.thing2 };
        })
      })
    ];
    const container = {
      // Note how thing2 is missing.
      _getDependencyTokens: spy(() => _tokens)
    };
    const success = spy();
    return resolveTokens(container).then(success, err => {
      success.should.not.have.been.called;
      expect(err).to.exist;
      err.message.should.contain('thing2');
      err.should.be.an.instanceOf(AwilixResolutionError);
    });
  });
});