'use strict';
const isFunction = require('./isFunction');
const camelCase = require('camel-case');

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
  const container = dependencies.container;
  return dependencies.listModules(globPatterns, opts).then(modules => {
    return Promise.all(
      modules.map(m => {
        const loaded = dependencies.require(m.path);

        // Meh, it happens.
        if (!loaded) {
          return undefined;
        }

        if (loaded.default && isFunction(loaded.default)) {
          // ES6 default export
          return { name: m.name, factory: loaded.default };
        }

        if (!isFunction(loaded)) {
          return undefined;
        }

        return { name: m.name, factory: loaded };
      })
    ).then((result) => {
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

        container.registerFactory(name, kvp.factory);
      });
      return {
        loadedModules: modules
      };
    });
  });
};