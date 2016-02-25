'use strict';

const AwilixResolutionError = require('./AwilixResolutionError');

/**
 * Given a container with tokens, will resolve them in the proper order.
 * This operation is recursive.
 *
 * @param  {AwilixContainer} container
 * The container to resolve tokens for.
 *
 * @return {Promise}
 * A promise for when we are done.
 */
function resolveTokens(container, _state) {
  const tokens = container._getDependencyTokens();
  const unresolvedTokens = tokens.filter(x => !x.resolved);
  if (unresolvedTokens.length === 0) return Promise.resolve();

  // Find all tokens which are ready for resolution.
  const registeredModules = Object.keys(container);

  // If we don't have state, create initial state and carry on.
  if (!_state) {
    _state = {
      previousLength: unresolvedTokens.length
    };
  } else {
    // If we do have state, make sure we won't be caught in a deadlock.
    if (_state.previousLength === unresolvedTokens.length) {
      return Promise.reject(
        new AwilixResolutionError(registeredModules, unresolvedTokens)
      );
    }
  }

  const resolvableTokens = unresolvedTokens.filter(
    x => x.canBeResolved(registeredModules)
  );

  return Promise.all(
    resolvableTokens.map(token => {
      return Promise.resolve(token.callback(container)).then(() => {
        token.markAsResolved();
      });
    })
  ).then(() => {
    return resolveTokens(container, _state);
  });
}

module.exports = resolveTokens;