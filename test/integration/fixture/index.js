const awilix = require('../../../lib/awilix')

module.exports = function () {
  const opts = { cwd: __dirname }
  return awilix
    .createContainer()
    .loadModules([
      ['services/*.js', awilix.Lifetime.SCOPED],
      'repositories/*.js'
    ], opts)
}
