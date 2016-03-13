'use strict';

const awilix = require('../../../lib/awilix');

module.exports = function () {
  const container = awilix.createContainer();
  return container.loadModules([
    'services/*.js'
  ], { cwd: __dirname }).then(() => {
    return container;
  });
};