'use strict';
const loadModules = require('./loadModules');
const listModules = require('./listModules');

/**
 * Creates an Awilix container instance.
 *
 * @return {AwilixContainer} The container.
 */
module.exports = function createContainer() {
  const container = {};

  /**
   * Takes a function and an optional context, returns the bound function.
   *
   * @param  {Function} fn
   * The function to bind.
   *
   * @param  {Object} ctx
   * The context to bind `this` to. Default is `null`.
   *
   * @return {Function}
   * The bound function.
   */
  container.bind = (fn, ctx) => fn.bind(ctx || null, container);

  /**
   * Binds all methods on the given object and returns the object
   * with the bound methods (same as input).
   *
   * @param  {Object} obj
   * The object containing functions to bind.
   *
   * @return {Object}
   * The passed-in object.
   */
  container.bindAll = obj => {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'function') {
        obj[key] = container.bind(value, obj);
      }
    });

    return obj;
  };

  /**
   * Uses Object.assign to assign the given object to the container.
   *
   * @param  {Object} obj
   * The object to register.
   *
   * @return {AwilixContainer}
   * The container
   */
  container.register = obj => {
    Object.assign(container, obj);
    return container;
  };

  /**
   * Binds `lib/loadModules` to this container, and provides
   * real implementations of it's dependencies.
   *
   * @see lib/loadModules.js documentation.
   */
  container.loadModules = loadModules.bind(null, {
    require: require,
    listModules: listModules,
    container: container
  });

  /**
   * Shortcut to the `lib/listModules` function.
   *
   * @see lib/listModules.js documentation.
   */
  container.listModules = listModules;

  return container;
};