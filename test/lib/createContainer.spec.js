'use strict';

const createContainer = require('../../lib/createContainer');

describe('createContainer', function() {
  it('creates a container with a bind method', function() {
    const container = createContainer();
    container.bind.should.exist;
  });

  describe('bind', function() {
    it('returns a bound method taking the container as the first parameter', function() {
      const container = createContainer();
      const bind = container.bind;
      const fn = sinon.spy(c => c);
      const bound = bind(fn);
      bound(1, 2, 3);
      fn.should.have.been.calledWith(container, 1, 2, 3);
    });
  });

  describe('bindAll', function() {
    it('binds all methods on the given object and returns it', function() {
      const method1 = sinon.spy();
      const method2 = sinon.spy();
      const obj = {
        method1,
        method2,
        primitive: 123
      };

      const container = createContainer();
      const boundObj = container.bindAll(obj);
      boundObj.should.equal(boundObj);
      boundObj.method1(1);
      boundObj.method2(2);
      boundObj.primitive.should.equal(123);
      method1.should.have.been.calledWith(container, 1);
      method2.should.have.been.calledWith(container, 2);
    });
  });

  describe('register', function() {
    it('registers the given hash on the container object itself', function() {
      const container = createContainer();

      const service1 = { stuff: true };
      container.register({
        service1
      });

      container.service1.should.equal(service1);
    });

    it('registers the given hash in container.registeredModules', function() {
      const container = createContainer();

      const service1 = { stuff: true };
      container.register({
        service1
      });

      container.registeredModules.service1.should.equal(service1);
    });
  });
});