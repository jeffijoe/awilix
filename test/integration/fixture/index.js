'use strict';

const awilix = require('../../../lib/awilix');

module.exports = function () {
  console.log(__dirname);

  const container = awilix.createContainer();
  return container.loadModules([
    'services/*.js',
    'repositories/*.js'
  ], { cwd: __dirname }).then(() => {
    return container;
  });
};