'use strict';

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
        if (loaded.default) {
          // ES6 default export
          return loaded.default(container);
        }

        return loaded(container);
      })
    ).then(() => {
      return {
        loadedModules: modules
      };
    });
  })
  // When done, return some stats.
  .then(() => container);
};