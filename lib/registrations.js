'use strict';
const isPlainObject = require('is-plain-object');
const Lifetime = require('./Lifetime');

/**
 * Makes an options object based on defaults.
 *
 * @param  {object} defaults
 * Default options.
 *
 * @param  {*} input
 * The input to check and possibly assign to the resulting object
 * .
 * @return {object}
 */
const makeOptions = (defaults, input) => {
  return Object.assign({}, defaults, input);
};

/**
 * Makes a generic resolver function that supports optional
 * singletoning.
 *
 * @param  {Function} actualResolver
 * The actual resolver function.
 *
 * @param  {object} opts.singleton
 * If set, will use the cache.
 *
 * @return {Function}
 * The resolver
 */
const makeResolver = (actualResolver, opts) => {
  let cached;

  const resolve = (container) => {
    if (opts.lifetime === Lifetime.SINGLETON && cached) {
      return cached;
    }
    const result = actualResolver(container);
    if (opts.lifetime === Lifetime.SINGLETON) {
      cached = result;
    }

    return result;
  };

  return resolve;
};

/**
 * Creats a simple value registration where the given value will always be resolved.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {*} value
 * The value to resolve.
 *
 * @return {object}
 * The registration.
 */
const valueRegistration = (name, value) => {
  const resolve = () => {
    return value;
  };

  return {
    name,
    resolve
  };
};

module.exports.valueRegistration = valueRegistration;

/**
 * Creats a factory registration, where the given factory function
 * will be invoked with `new` when requested.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {Function} factory
 * The function to register.
 *
 * @param {object} opts
 * Additional options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const factoryRegistration = (name, factory, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT
  };

  opts = makeOptions(defaults, opts);

  const resolve = makeResolver((container) => factory(container.cradle), opts);

  return {
    name,
    resolve
  };
};

module.exports.factoryRegistration = factoryRegistration;

/**
 * Like a factory registration, but for classes that require `new`.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {Class} type
 * The function to register.
 *
 * @param {object} opts
 * Additional options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const classRegistration = (name, type, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT
  };

  opts = makeOptions(defaults, opts);

  const resolve = makeResolver((container) => new type(container.cradle), opts);

  return {
    name,
    resolve
  };
};

module.exports.classRegistration = classRegistration;