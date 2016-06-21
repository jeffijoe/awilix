'use strict';
const loadModules = require('./loadModules');
const listModules = require('./listModules');
const isFunction = require('./isFunction');
const { factoryRegistration, valueRegistration, classRegistration } = require('./registrations');
const AwilixResolutionError = require('./AwilixResolutionError');
const nameValueToObject = require('./nameValueToObject');

/**
 * Creates an Awilix container instance.
 *
 * @param {Function} options.require
 * The require function to use. Defaults to require.
 *
 * @return {object}
 * The container.
 */
module.exports = function createContainer(options) {
  options = options || {};

  // The resolution stack is used to keep track
  // of what modules are being resolved, so when
  // an error occurs, we have something to present
  // to the poor developer who fucked up.
  let resolutionStack = [];

  // When registering a module, this is what is used to keep track of how to instantiate it.
  const registrations = {};
  const container = {
    /**
     * Makes the registrations get-only. In the future we may use this to introduce child containers.
     *
     * @return {object}
     */
    get registrations() {
      return registrations;
    }
  };

  // Partially applied to the loadModules function.
  const _loadModulesDeps = {
    require: options.require || require,
    listModules: listModules,
    container: container
  };

  /**
   * The `Proxy` that is passed to functions so they can resolve their dependencies without
   * knowing where they come from. I call it the "cradle" because
   * it is where registered things come to life at resolution-time.
   */
  const cradle = new Proxy({}, {
    /**
     * The `get` handler is invoked whenever a get-call for `container.cradle.*` is made.
     *
     * @param  {object} target
     * The proxy target. Irrelevant.
     *
     * @param  {string} name
     * The property name.
     *
     * @return {*}
     * Whatever the resolve call returns.
     */
    get: (target, name) => resolve(name)
  });

  container.cradle = cradle;

  /**
   * Makes a register function from the given factory.
   *
   * @param  {Function} registrationFactory
   * The factory to invoke.
   *
   * @return {Function}
   */
  const makeRegisterFunction = (registrationFactory) => {
    // The registration function that will be called.
    return (name, value) => {
      const obj = nameValueToObject(name, value);
      Object.keys(obj).forEach(key => register(registrationFactory(key, obj[key])));
      return container;
    };
  };

  /**
   * Registers a value that will be resolved when needed.
   * See the documentation for `valueRegistration` describing
   * the resolution strategy.
   *
   * @param  {string|object} name
   * Can be a string or an object of { name: fn }. If the former, `value` is used.
   *
   * @param  {*} value
   * The value to register. If the `name` is an object hash, this isn't used.
   *
   * @return {object}
   * The container.
   */
  const registerValue = makeRegisterFunction(valueRegistration);
  container.registerValue = registerValue;

  /**
   * Registers a factory function that will be invoked with the cradle and returns
   * whatever should be registered.
   * See the documentation for `factoryRegistration` describing
   * the resolution strategy.
   *
   * @param  {string|object} name
   * Can be a string or an object of { name: fn }. If the former, `value` is used.
   *
   * @param  {Function} value
   * The function to register. If the `name` is an object hash, this isn't used.
   *
   * @return {object}
   * The container.
   */
  const registerFactory = makeRegisterFunction(factoryRegistration);
  container.registerFactory = registerFactory;

  /**
   * Registers a class that will be invoked with `new` and the cradle as the only
   * argument.
   * See the documentation for `factoryRegistration` describing
   * the resolution strategy.
   *
   * @param  {string|object} name
   * Can be a string or an object of { name: fn }. If the former, `value` is used.
   *
   * @param  {Function} value
   * The function to register. If the `name` is an object hash, this isn't used.
   *
   * @return {object}
   * The container.
   */
  const registerClass = makeRegisterFunction(classRegistration);
  container.registerClass = registerClass;

  /**
   * Adds a registration that has been manually constructed.
   *
   * @param  {Registration}
   * registration
   *
   * @return {object}
   * The container.
   */
  const register = (registration) => {
    registrations[registration.name] = registration;
    return this;
  };

  container.register = register;

  /**
   * Resolves the registration with the given name.
   *
   * @param  {string} name
   * The name of the registration to resolve.
   *
   * @return {*}
   * Whatever was resolved.
   */
  const resolve = (name) => {
    const registration = registrations[name];
    if (resolutionStack.indexOf(name) > -1) {
      throw new AwilixResolutionError(name, resolutionStack, 'Cyclic dependencies detected.');
    }

    if (!registration) {
      throw new AwilixResolutionError(name, resolutionStack);
    }

    try {
      // Pushes the currently-resolving module name onto the stack
      resolutionStack.push(name);
      // Do the thing
      const resolved = registration.resolve(container);
      // Pop it from the stack again, ready for the next resolution
      resolutionStack.pop();
      return resolved;
    } catch (err) {
      // When we get an error we need to reset the stack.
      resolutionStack = [];
      throw err;
    }
  };

  container.resolve = resolve;

  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * Additionally, any modules using the `dependsOn` API
   * will be resolved.
   *
   * @see lib/loadModules.js documentation.
   */
  container.loadModules = (globPatterns, opts) => {
    return loadModules(_loadModulesDeps, globPatterns, opts);
  };

  /**
   * Shortcut to the `lib/listModules` function.
   *
   * @see lib/listModules.js documentation.
   */
  container.listModules = listModules;

  // Finally return the container
  return container;
};