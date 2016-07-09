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
  opts = Object.assign({ cwd: process.cwd(), glob: glob.sync }, opts);
  const result = opts.glob(globPattern, { cwd: opts.cwd });
  const mapped = result.map(p => ({
    name: nameExpr.exec(path.basename(p))[1],
    path: path.resolve(opts.cwd, p)
  }));
  return mapped;
}

/**
 * Returns a promise for a list of {name, path} pairs,
 * where the name is the module name, and path is the actual
 * full path to the module.
 *
 * @param  {String|Array<String>} globPatterns
 * The glob pattern as a string or an array of strings.
 *
 * @param  {String} opts.cwd
 * Current working directory, used for resolving filepaths.
 * Defaults to `process.cwd()`.
 *
 * @return {Promise<[{name, path}]>}
 * A promise for the module names and paths.
 */
module.exports = function listModules(globPatterns, opts) {
  if (globPatterns instanceof Array) {
    return flatten(
      globPatterns.map(
        p => _listModules(p, opts)
      )
    );
  }

  return _listModules(globPatterns, opts);
};