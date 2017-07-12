const AwilixError = require('./AwilixError')

/**
 * Error thrown to indicate Awilix was expecting a function (or a class)
 */
class AwilixNotAFunctionError extends AwilixError {
  /**
   * Constructor, takes the function name, expected and given
   * type to produce an error.
   *
   * @param {string} functionName
   * Name of the function being guarded.
   *
   * @param {string} expectedType
   * Name of the expected type.
   *
   * @param {string} givenType
   * Name of the given type.
   */
  constructor (functionName, expectedType, givenType) {
    super(`The function ${functionName} expected a ${expectedType}, ${givenType} given.`)
  }
}

module.exports = AwilixNotAFunctionError
