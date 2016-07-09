'use strict';

// Export the public API.
module.exports = {
  createContainer: require('./createContainer'),
  AwilixResolutionError: require('./AwilixResolutionError'),
  listModules: require('./listModules'),
  Lifetime: require('./Lifetime')
};

// Assigns registrations
Object.assign(module.exports, require('./registrations'));