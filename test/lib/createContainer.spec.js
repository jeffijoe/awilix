'use strict';

const createContainer = require('../../lib/createContainer');
const Lifetime = require('../../lib/Lifetime');
const { catchError } = require('../helpers/errorHelpers');
const AwilixResolutionError = require('../../lib/AwilixResolutionError');
const { asClass, asFunction, asValue } = require('../../lib/registrations');

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
      container.register({ someValue: asValue(42) });
      container.register({
        test: asFunction((deps) => {
          return {
            someValue: deps.someValue
          };
        })
      });

      const test = container.cradle.test;
      expect(test).to.be.ok;
      test.someValue.should.equal(42);
    });

    describe('register', function() {
      it('supports multiple registrations in a single call', function() {
        const container = createContainer();
        container.register({
          universe: asValue(42),
          leet: asValue(1337)
        });

        container.register({
          service: asFunction(({ func, universe }) => ({ method: () => func(universe) })),
          func: asFunction(() => (answer) => 'Hello world, the answer is ' + answer)
        });

        Object.keys(container.registrations).length.should.equal(4);

        container.resolve('service').method().should.equal('Hello world, the answer is 42');
      });

      it('supports classes', function() {
        const container = createContainer();
        container.register({
          test: asClass(Test),
          repo: asClass(Repo)
        });

        container.resolve('test').stuff().should.equal('stuff');
      });
    });

    describe('register* functions', function() {
      let container;
      beforeEach(function() {
        container = createContainer();
      });

      it('supports registerClass', function() {
        container.registerClass('nameValue', Test);
        container.registerClass('nameValueWithOpts', Test, { lifetime: Lifetime.SCOPED });
        container.registerClass('nameValueWithArray', [Test, { lifetime: Lifetime.SCOPED }]);
        container.registerClass({
          obj: Test,
          objWithOpts: [Test, { lifetime: Lifetime.SCOPED }]
        });

        container.registrations.nameValue.lifetime.should.equal(Lifetime.TRANSIENT);
        container.registrations.nameValueWithArray.lifetime.should.equal(Lifetime.SCOPED);
        container.registrations.nameValueWithOpts.lifetime.should.equal(Lifetime.SCOPED);

        container.registrations.obj.lifetime.should.equal(Lifetime.TRANSIENT);
        container.registrations.objWithOpts.lifetime.should.equal(Lifetime.SCOPED);
      });

      it('supports registerFunction', function() {
        const fn = () => 42;
        container.registerFunction('nameValue', fn);
        container.registerFunction('nameValueWithOpts', fn, { lifetime: Lifetime.SCOPED });
        container.registerFunction('nameValueWithArray', [fn, { lifetime: Lifetime.SCOPED }]);
        container.registerFunction({
          obj: fn,
          objWithOpts: [fn, { lifetime: Lifetime.SCOPED }]
        });

        container.registrations.nameValue.lifetime.should.equal(Lifetime.TRANSIENT);
        container.registrations.nameValueWithArray.lifetime.should.equal(Lifetime.SCOPED);
        container.registrations.nameValueWithOpts.lifetime.should.equal(Lifetime.SCOPED);

        container.registrations.obj.lifetime.should.equal(Lifetime.TRANSIENT);
        container.registrations.objWithOpts.lifetime.should.equal(Lifetime.SCOPED);
      });

      it('supports registerValue', function() {
        container.registerValue('nameValue', 1);
        container.registerValue({
          obj: 2,
          another: 3
        });

        container.resolve('nameValue').should.equal(1);
        container.resolve('obj').should.equal(2);
        container.resolve('another').should.equal(3);
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
        container.registerFunction({ factory: (cradle) => () => factorySpy(cradle) });
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
        container.registerFunction({
          first: (cradle) => cradle.second,
          second: (cradle) => cradle.third,
          third: (cradle) => cradle.unregistered
        });

        const err = catchError(() => container.resolve('first'));
        err.message.should.contain('first -> second -> third');
      });

      it('does not screw up the resolution stack when called twice', function() {
        const container = createContainer();
        container.registerFunction({
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

      it('supports transient lifetime', function() {
        const container = createContainer();
        let counter = 1;
        container.register({
          hehe: asFunction(() => counter++).transient()
        });

        container.cradle.hehe.should.equal(1);
        container.cradle.hehe.should.equal(2);
      });

      it('supports singleton lifetime', function() {
        const container = createContainer();
        let counter = 1;
        container.register({
          hehe: asFunction(() => counter++).singleton()
        });

        container.cradle.hehe.should.equal(1);
        container.cradle.hehe.should.equal(1);
      });

      it('supports scoped lifetime', function() {
        const container = createContainer();
        let scopedCounter = 1;
        container.register({
          scoped: asFunction(() => scopedCounter++).scoped()
        });

        const scope1 = container.createScope();
        scope1.cradle.scoped.should.equal(1);
        scope1.cradle.scoped.should.equal(1);

        const scope2 = container.createScope();
        scope2.cradle.scoped.should.equal(2);
        scope2.cradle.scoped.should.equal(2);
      });

      it('caches singletons regardless of scope', function() {
        const container = createContainer();
        let singletonCounter = 1;
        container.register({
          singleton: asFunction(() => singletonCounter++).singleton()
        });

        const scope1 = container.createScope();
        scope1.cradle.singleton.should.equal(1);
        scope1.cradle.singleton.should.equal(1);

        const scope2 = container.createScope();
        scope2.cradle.singleton.should.equal(1);
        scope2.cradle.singleton.should.equal(1);
      });

      it('resolves transients regardless of scope', function() {
        const container = createContainer();
        let transientCounter = 1;
        container.register({
          transient: asFunction(() => transientCounter++).transient()
        });

        const scope1 = container.createScope();
        scope1.cradle.transient.should.equal(1);
        scope1.cradle.transient.should.equal(2);

        const scope2 = container.createScope();
        scope2.cradle.transient.should.equal(3);
        scope2.cradle.transient.should.equal(4);
      });

      it('uses parents cache when scoped', function() {
        const container = createContainer();
        let scopedCounter = 1;
        container.register({
          scoped: asFunction(() => scopedCounter++).scoped()
        });

        const scope1 = container.createScope();
        scope1.cradle.scoped.should.equal(1);
        scope1.cradle.scoped.should.equal(1);

        const scope2 = scope1.createScope();
        scope2.cradle.scoped.should.equal(1);
        scope2.cradle.scoped.should.equal(1);

        container.cradle.scoped.should.equal(2);
        container.cradle.scoped.should.equal(2);
        scope2.cradle.scoped.should.equal(1);
      });

      it('supports nested scopes', function() {
        const container = createContainer();

        // Increments the counter every time it is resolved.
        let counter = 1;
        container.register({
          counterValue: asFunction(() => counter++).scoped()
        });
        const scope1 = container.createScope();
        const scope2 = container.createScope();

        const scope1Child = scope1.createScope();

        scope1.cradle.counterValue.should.equal(1);
        scope1.cradle.counterValue.should.equal(1);
        scope2.cradle.counterValue.should.equal(2);
        scope2.cradle.counterValue.should.equal(2);
        scope1Child.cradle.counterValue.should.equal(1);
      });

      it('resolves dependencies in scope', function() {
        const container = createContainer();
        // Register a transient function
        // that returns the value of the scope-provided dependency.
        // For this example we could also use scoped lifetime.
        container.register({
          scopedValue: asFunction((cradle) => 'Hello ' + cradle.someValue)
        });

        // Create a scope and register a value.
        const scope = container.createScope();
        scope.register({
          someValue: asValue('scope')
        });

        scope.cradle.scopedValue.should.equal('Hello scope');
      });

      it('cannot find a scope-registered value when resolved from root', function() {
        const container = createContainer();
        // Register a transient function
        // that returns the value of the scope-provided dependency.
        // For this example we could also use scoped lifetime.
        container.register({
          scopedValue: asFunction((cradle) => 'Hello ' + cradle.someValue)
        });

        // Create a scope and register a value.
        const scope = container.createScope();
        scope.register({
          someValue: asValue('scope')
        });

        expect(() => container.cradle.scopedValue).to.throw(AwilixResolutionError);
      });

      it('throws an AwilixResolutionError when there are cyclic dependencies', function() {
        const container = createContainer();
        container.registerFunction({
          first: (cradle) => cradle.second,
          second: (cradle) => cradle.third,
          third: (cradle) => cradle.second
        });

        const err = catchError(() => container.resolve('first'));
        err.message.should.contain('first -> second -> third -> second');
      });

      it('throws an AwilixResolutionError when the lifetime is unknown', function() {
        const container = createContainer();
        container.registerFunction({
          first: (cradle) => cradle.second,
          second: [(cradle) => 'hah', { lifetime: 'lol' }]
        });

        const err = catchError(() => container.resolve('first'));
        err.message.should.contain('first -> second');
        err.message.should.contain('lol');
      });
    });
  });
});