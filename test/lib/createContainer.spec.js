'use strict';

const createContainer = require('../../lib/createContainer');

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
    return 'stuff'
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
  });
});