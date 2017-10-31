const awilix = require('../../../lib/awilix')

module.exports = function() {
  const opts = { cwd: __dirname }
  return awilix
    .createContainer()
    .registerValue({
      conn: {}
    })
    .loadModules(
      [
        ['services/*.js', awilix.Lifetime.SCOPED],
        ['repositories/*.js', { injector: () => ({ timeout: 10 }) }]
      ],
      opts
    )
}
