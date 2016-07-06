'use strict';

const createContainer = require('../../lib/createContainer');
const Lifetime = require('../../lib/Lifetime');
const { catchError } = require('../helpers/errorHelpers');
const AwilixResolutionError = require('../../lib/AwilixResolutionError');

class Test {
  constructor({ repo }) {
    this.repo = repo;
  }

  stuff() {
    return this.repo.getStuff();
  }
}

class Repo {
  getStuff() {
    return 'stuff';
  }
}

describe('createContainer', function() {
  it('returns an object', function() {
    const container = createContainer();
    container.should.be.an.object;
  });

  describe('container', function() {
    it('lets me register something and resolve it', function() {
      const container = createContainer();
      container.registerValue({ someValue: 42 });
      container.registerFactory({
        test: (deps) => {
          return {
            someValue: deps.someValue
          };
        }
      });

      const test = container.cradle.test;
      expect(test).to.be.ok;
      test.someValue.should.equal(42);
    });

    describe('register*', function() {
      it('supports multiple registrations in a single call', function() {
        const container = createContainer();
        container.registerValue({
          universe: 42,
          leet: 1337
        });

        container.registerFactory({
          service: ({ func, universe }) => ({ method: () => func(universe) }),
          func: () => (answer) => 'Hello world, the answer is ' + answer
        });

        Object.keys(container.registrations).length.should.equal(4);

        container.resolve('service').method().should.equal('Hello world, the answer is 42');
      });

      it('passes default options to registration functions', function() {
        const container = createContainer({
          defaultOptions: {
            lifetime: Lifetime.SINGLETON
          }
        });
        let i = 1;
        container.registerFactory('test', () => i++);
        container.resolve('test').should.equal(1);
        container.resolve('test').should.equal(1);
      });
    });

    describe('registerClass', function() {
      it('supports classes', function() {
        const container = createContainer();
        container.registerClass({
          test: Test,
          repo: Repo
        });

        container.resolve('test').stuff().should.equal('stuff');
      });
    });

    describe('resolve', function() {
      it('resolves the dependency chain and supports all registrations', function() {
        class TestClass {
          constructor({ factory }) {
            this.factoryResult = factory();
          }
        }

        const factorySpy = sinon.spy((cradle) => 'factory ' + cradle.value);
        const container = createContainer();
        container.registerValue({ value: 42 });
        container.registerFactory({ factory: (cradle) => () => factorySpy(cradle) });
        container.registerClass({ theClass: TestClass });

        const root = container.resolve('theClass');
        root.factoryResult.should.equal('factory 42');
      });

      it('throws an AwilixResolutionError when there are unregistered dependencies', function() {
        const container = createContainer();
        const err = catchError(() => container.resolve('nope'));
        err.should.be.an.instanceOf(AwilixResolutionError);
        err.message.should.match(/nope/i);
      });

      it('throws an AwilixResolutionError with a resolution path when resolving an unregistered dependency', function() {
        const container = createContainer();
        container.registerFactory({
          first: (cradle) => cradle.second,
          second: (cradle) => cradle.third,
          third: (cradle) => cradle.unregistered
        });

        const err = catchError(() => container.resolve('first'));
        err.message.should.contain('first -> second -> third');
      });

      it('does not screw up the resolution stack when called twice', function() {
        const container = createContainer();
        container.registerFactory({
          first: (cradle) => cradle.second,
          otherFirst: (cradle) => cradle.second,
          second: (cradle) => cradle.third,
          third: (cradle) => cradle.unregistered
        });

        const err1 = catchError(() => container.resolve('first'));
        const err2 = catchError(() => container.resolve('otherFirst'));
        err1.message.should.contain('first -> second -> third');
        err2.message.should.contain('otherFirst -> second -> third');
      });

      it('throws an AwilixResolutionError when there are cyclic dependencies', function() {
        const container = createContainer();
        container.registerFactory({
          first: (cradle) => cradle.second,
          second: (cradle) => cradle.third,
          third: (cradle) => cradle.second
        });

        const err = catchError(() => container.resolve('first'));
        err.message.should.contain('first -> second -> third -> second');
      });
    });
  });
});