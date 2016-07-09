'use strict';
const isFunction = require('./isFunction');
const camelCase = require('camel-case');
const isClass = require('is-class');
const Lifetime = require('./Lifetime');
const registrations = require('./registrations');

const nameFormatters = {
  camelCase
};

/**
 * Given an array of glob strings, will call `require`
 * on them, and call their default exported function with the
 * container as the first parameter.
 *
 * @param  {AwilixContainer} dependencies.container
 * The container to install loaded modules in.
 *
 * @param  {Function} dependencies.listModules
 * The listModules function to use for listing modules.
 *
 * @param  {Function} dependencies.require
 * The require function - it's a dependency because it makes testing easier.
 *
 * @param  {String[]} globPatterns
 * The array of globs to use when loading modules.
 *
 * @param  {Object} opts
 * Passed to `listModules`, e.g. `{ cwd: '...' }`.
 *
 * @return {Promise<Object>}
 * A promise for when we are done. Returns an object
 * describing the result.
 */
module.exports = function loadModules(dependencies, globPatterns, opts) {
  opts = opts || {};
  opts = Object.assign({}, {
    registrationOptions: {
      lifetime: Lifetime.TRANSIENT
    }
  }, opts);
  const container = dependencies.container;
  const modules = dependencies.listModules(globPatterns, opts);
  const result = modules.map(m => {
    const loaded = dependencies.require(m.path);

    // Meh, it happens.
    if (!loaded) {
      return undefined;
    }

    if (!isFunction(loaded)) {
      if (loaded.default && isFunction(loaded.default)) {
        // ES6 default export
        return { name: m.name, value: loaded.default };
      }

      return undefined;
    }

    return { name: m.name, value: loaded };
  });
  result.filter(x => x).forEach(kvp => {
    let name = kvp.name;
    let formatter = opts.formatName;
    if (formatter) {
      if (typeof formatter === 'string') {
        formatter = nameFormatters[formatter];
      }

      if (formatter) {
        name = formatter(name);
      }
    }

    const reg = isClass(kvp.value) ? registrations.asClass : registrations.asFunction;
    const lifetime = opts.registrationOptions && opts.registrationOptions.lifetime || Lifetime.TRANSIENT;
    container.register(
      name,
      reg(kvp.value, { lifetime: lifetime })
    );
  });
  return {
    loadedModules: modules
  };
};