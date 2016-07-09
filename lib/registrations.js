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
 * Given an options object, creates a fluid interface
 * to manage it.
 *
 * @param {*} returnValue
 * The object to return.
 *
 * @param  {object} opts
 * The options to manage.
 *
 * @return {object}
 * The interface.
 */
const makeFluidInterface = (obj) => {
  const setLifetime = (value) => {
    obj.lifetime = value;
    return obj;
  };

  return {
    setLifetime,
    transient: () => setLifetime(Lifetime.TRANSIENT),
    scoped: () => setLifetime(Lifetime.SCOPED),
    singleton: () => setLifetime(Lifetime.SINGLETON)
  };
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
const asValue = (value) => {
  const resolve = () => {
    return value;
  };

  return {
    resolve,
    lifetime: Lifetime.TRANSIENT
  };
};

module.exports.asValue = asValue;

/**
 * Creats a factory registration, where the given factory function
 * will be invoked with `new` when requested.
 *
 * @param  {string} name
 * The name to register the value as.
 *
 * @param  {Function} fn
 * The function to register.
 *
 * @param {object} opts
 * Additional options for the resolver.
 *
 * @return {object}
 * The registration.
 */
const asFunction = (fn, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT
  };

  opts = makeOptions(defaults, opts);

  const resolve = (container) => fn(container.cradle);

  const result = {
    resolve,
    lifetime: opts.lifetime
  };
  Object.assign(result, makeFluidInterface(result));
  return result;
};

module.exports.asFunction = asFunction;

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
const asClass = (type, opts) => {
  const defaults = {
    lifetime: Lifetime.TRANSIENT
  };

  opts = makeOptions(defaults, opts);

  const resolve = (container) => new type(container.cradle);

  const result = {
    resolve,
    lifetime: opts.lifetime
  };

  Object.assign(result, makeFluidInterface(result));
  return result;
};

module.exports.asClass = asClass;