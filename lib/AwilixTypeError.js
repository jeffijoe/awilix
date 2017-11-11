const AwilixError = require('./AwilixError')

/**
 * Error thrown to indicate a type mismatch.
 * TODO(v3): remove `AwilixNotAFunctionError` and use this.
 */
class AwilixTypeError extends AwilixError {
  /**
   * Constructor, takes the function name, expected and given
   * type to produce an error.
   *
   * @param {string} funcDescription
   * Name of the function being guarded.
   *
   * @param {string} paramName
   * The parameter there was an issue with.
   *
   * @param {string} expectedType
   * Name of the expected type.
   *
   * @param {string} givenType
   * Name of the given type.
   */
  constructor(funcDescription, paramName, expectedType, givenType) {
    super(
      `${funcDescription}: expected ${paramName} to be ${
        expectedType
      }, but got ${givenType}.`
    )
  }
}

/**
 * Asserts the given condition, throws an error otherwise.
 *
 * @param {*} condition
 * The condition to check
 *
 * @param {string} funcDescription
 * Name of the function being guarded.
 *
 * @param {string} paramName
 * The parameter there was an issue with.
 *
 * @param {string} expectedType
 * Name of the expected type.
 *
 * @param {string} givenType
 * Name of the given type.
 */
AwilixTypeError.assert = function assert(
  condition,
  funcDescription,
  paramName,
  expectedType,
  givenType
) {
  if (!condition) {
    throw new AwilixTypeError(
      funcDescription,
      paramName,
      expectedType,
      givenType
    )
  }
  return condition
}

module.exports = AwilixTypeError
