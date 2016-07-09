const awilix = require('../../../lib/awilix');

module.exports = function () {
  const container = awilix.createContainer();
  container.loadModules([
    'services/*.js',
    'repositories/*.js'
  ], { cwd: __dirname });
  return container;
};