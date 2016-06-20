'use strict';

const { valueRegistration, factoryRegistration, classRegistration } = require('../../lib/registrations');
const createContainer = require('../../lib/createContainer');

const testFn = () => 1337;

class TestClass {}

describe('registrations', function() {
  let container;
  beforeEach(function() {
    container = createContainer();
  });

  describe('valueRegistration', function() {
    it('creates a registration with a resolve method', function() {
      valueRegistration('test', 42).resolve.should.be.a.function;
    });
  });

  describe('factoryRegistration', function() {
    it('creates a registration with a resolve method', function() {
      factoryRegistration('test', testFn).resolve.should.be.a.function;
    });

    it('defaults to singleton', function() {
      const testSpy = sinon.spy(testFn);
      const reg = factoryRegistration('test', () => testSpy());
      const resolved1 = reg.resolve(container);
      const resolved2 = reg.resolve(container);

      testSpy.should.have.been.calledOnce;
    });

    it('resolves multiple times when not singleton', function() {
      const testSpy = sinon.spy(testFn);
      const reg = factoryRegistration('test', {
        factory: () => testSpy(),
        singleton: false
      });
      const resolved1 = reg.resolve(container);
      const resolved2 = reg.resolve(container);

      testSpy.should.have.been.calledTwice;
    });
  });

  describe('classRegistration', function() {
    it('creates a registration with a resolve method', function() {
      classRegistration('test', TestClass).resolve.should.be.a.function;
    });

    it('resolves the class by newing it up', function() {
      const reg = classRegistration('test', TestClass);
      const result = reg.resolve(container);
      result.should.be.an.instanceOf(TestClass);
    });
  });
});
