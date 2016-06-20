'use strict';
const isPlainObject = require('is-plain-object');

/**
 * Makes an options object with the given input
 * if it's not already an options object.
 *
 * @param  {string} key
 * Where in the new object should we put the original input?
 *
 * @param  {object} defaults
 * Default options.
 *
 * @param  {*} input
 * The input to check and possibly assign to the resulting object
 * .
 * @return {object}
 */
const makeOptions = (key, defaults, input) => {
  if (!isPlainObject(input)) {
    const obj = {};
    obj[key] = input;
    input = Object.assign({}, defaults, obj);
  }

  return input;
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
    if (opts.singleton && cached) {
      return cached;
    }
    const result = actualResolver(container);
    if (opts.singleton) {
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
 * @param  {Function|object} value
 * The function to register, or an object with a { factory: fn } set.
 * Can contain extra options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const factoryRegistration = (name, opts) => {
  const defaults = {
    singleton: true
  };

  opts = makeOptions('factory', defaults, opts);

  const resolve = makeResolver((container) => opts.factory(container.cradle), opts);

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
 * @param  {Class|object} value
 * The function to register, or an object with a { factory: Class } set.
 * Can contain extra options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const classRegistration = (name, opts) => {
  const defaults = {
    singleton: true
  };

  opts = makeOptions('type', defaults, opts);

  const resolve = makeResolver((container) => new opts.type(container.cradle), opts);

  return {
    name,
    resolve
  };
};

module.exports.classRegistration = classRegistration;