const ExtendableError = require('./ExtendableError')

/**
 * Base error for all Awilix-specific errors.
 */
class AwilixError extends ExtendableError {}

module.exports = AwilixError
