'use strict';
const glob = require('glob');
const path = require('path');
const flatten = require('./flatten');

// Regex to extract the module name.
const nameExpr = /(.*)\..*/i;

/**
 * Internal method for globbing a single pattern.
 *
 * @param  {String} globPattern
 * The glob pattern.
 *
 * @param  {String} opts.cwd
 * Current working directory, used for resolving filepaths.
 * Defaults to `process.cwd()`.
 *
 * @return {Promise<[{name, path}]>}
 * A promise for the module names and paths.
 *
 * @api private
 */
function _listModules(globPattern, opts) {
  return new Promise((resolve, reject) => {
    opts = Object.assign({ cwd: process.cwd(), glob: glob }, opts);
    opts.glob(globPattern, { cwd: opts.cwd }, (err, result) => {
      if (err) return reject(err);
      const mapped = result.map(p => ({
        name: nameExpr.exec(path.basename(p))[1],
        path: path.resolve(p)
      }));
      return resolve(mapped);
    });
  });
}

/**
 * Returns a promise for a list of {name, path} pairs,
 * where the name is the module name, and path is the actual
 * full path to the module.
 *
 * @param  {String|Array<String>} globPattern
 * The glob pattern as a string or an array of strings.
 *
 * @param  {String} opts.cwd
 * Current working directory, used for resolving filepaths.
 * Defaults to `process.cwd()`.
 *
 * @return {Promise<[{name, path}]>}
 * A promise for the module names and paths.
 */
module.exports = function listModules(globPattern, opts) {
  if (globPattern instanceof Array) {
    return Promise.all(
      globPattern.map(
        p => _listModules(p, opts)
      )
    ).then(flatten);
  }

  return _listModules(globPattern, opts);
};