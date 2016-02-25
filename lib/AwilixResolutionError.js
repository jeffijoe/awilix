'use strict';

const flatten = require('./flatten');
const EOL = require('os').EOL;
const ExtendableError = require('./ExtendableError');

/**
 * Creates an error message so the developer knows what dependencies are missing.
 *
 * @param  {Array<String>} registeredModules
 * A list of the registered modules.
 *
 * @param  {Array<DependencyToken>} unresolvedTokens
 * The unresolved tokens.
 *
 * @return {String}
 * The error message.
 */
const createErrorMessage = (registeredModules, unresolvedTokens) => {
  const allDependencies = flatten(
    unresolvedTokens.map(x => x.dependencies)
  );

  const unresolvedDependencies = allDependencies
    .filter(d => !registeredModules.indexOf(d) > -1)
    .join(', ');

  const message =
    'Could not resolve dependency tree, as some dependencies were never registered.' +
    EOL + EOL +
    `Unresolved dependencies: ${unresolvedDependencies}` +
    EOL + EOL +
    'Please make sure you register them with the container in the modules they are being loaded from.';
  return message;
};

/**
 * A nice error class so we can do an instanceOf check.
 */
class AwilixResolutionError extends ExtendableError {
  /**
   * Constructor, takes the registered modules and unresolved tokens
   * to create a message.
   * @param  {Array<String>} registeredModules
   * A list of the registered modules.
   *
   * @param  {Array<DependencyToken>} unresolvedTokens
   * The unresolved tokens.
   */
  constructor(registeredModules, unresolvedTokens) {
    super(createErrorMessage(registeredModules, unresolvedTokens));
  }
}

module.exports = AwilixResolutionError;