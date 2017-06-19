const ExtendableError = require('./ExtendableError')

/**
 * Error thrown to indicate awilix was expecting a function (or class)
 */
class AwilixNotAFunctionError extends ExtendableError {
  /**
   * Constructor, takes the registered modules and unresolved tokens
   * to create a message.
   *
   * @param {string} name
   * The name of the module that could not be resolved.
   *
   * @param  {string[]} resolutionStack
   * The current resolution stack
   */
  constructor (functionName, expectedType, givenType) {
    super(`The function ${functionName} expected a ${expectedType}, ${givenType} given.`)
  }
}

module.exports = AwilixNotAFunctionError
