'use strict';

// Utility to throw an error.
const argErr = argName => {
  throw new Error(`${argName} missing in dependsOn`);
};

/**
 * Creates an object that contains info about
 * a thing's needs.
 * TODO: Document params.
 * @api private
 */
function dependencyToken(attrs) {
  if (!attrs) argErr('Options object');
  if (!attrs.dependencies) argErr('dependencies');
  if (!attrs.callback) argErr('callback');

  const token = {
    __dependencyToken: true,
    dependencies: [].concat(attrs.dependencies),
    callback: attrs.callback,
    resolved: false
  };

  // Determines if this token depends on
  // any of the given dependencies.
  // token.dependsOn = dependencies => token.dependencies.some(
  //   x => dependencies.some(
  //     y => x === y
  //   )
  // );

  // Tells us if this token is ready to be resolved.
  token.canBeResolved = dependencies => token.dependencies.every(
    x => dependencies.some(
      y => x === y
    )
  );

  // Marks the token as resolved.
  token.markAsResolved = () => {
    token.resolved = true;
  };

  return token;
}

module.exports = dependencyToken;