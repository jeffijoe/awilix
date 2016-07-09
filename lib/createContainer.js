'use strict';
const loadModules = require('./loadModules');
const listModules = require('./listModules');
const isFunction = require('./isFunction');
const { asClass, asFunction, asValue } = require('./registrations');
const AwilixResolutionError = require('./AwilixResolutionError');
const nameValueToObject = require('./nameValueToObject');
const Lifetime = require('./Lifetime');
const isPlainObject = require('is-plain-object');

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
   * Adds a registration that has been manually constructed.
   *
   * @param  {Registration}
   * registration
   *
   * @return {object}
   * The container.
   */
  const register = (name, registration) => {
    const obj = nameValueToObject(name, registration);
    for (let key in obj) {
      const value = obj[key];
      registrations[key] = value;
    }

    return this;
  };

  container.register = register;

  /**
   * Makes a register function.
   */
  const makeRegister = (fn) => (name, value, opts) => {
    // This ensures that we can support name+value style and object style.
    const obj = nameValueToObject(name, value);

    for (let key in obj) {
      let valueToRegister = obj[key];

      // If we have options, copy them over.
      opts = Object.assign({}, opts);
      if (Array.isArray(valueToRegister)) {
        // The ('name', [value, opts]) style
        opts = Object.assign({}, opts, valueToRegister[1]);
        valueToRegister = valueToRegister[0];
      }

      register(key, fn(valueToRegister, opts));
    }

    // Chaining
    return this;
  };

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerFunction = makeRegister(asFunction);

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerClass = makeRegister(asClass);

  /**
   * Registers the given values as functions.
   *
   * @param {string|object}
   * The name to register, or an object { name: fn } or { name: [fn, opts]}.
   *
   * @param {Function} fn
   * The function to register, if using the string variant.
   *
   * @return {object}
   * The container
   */
  container.registerValue = makeRegister(asValue);

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