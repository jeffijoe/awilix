const EOL = require('os').EOL
const ExtendableError = require('./ExtendableError')

/**
 * Creates an error message so the developer knows what dependencies are missing.
 *
 * @param  {Array<String>} registeredModules
 * A list of the registered modules.
 *
 * @param  {Array<DependencyToken>} unresolvedTokens
 * The unresolved tokens.
 *
 * @return {String}
 * The error message.
 */
const createErrorMessage = (name, resolutionStack, message) => {
  resolutionStack = resolutionStack.slice()
  resolutionStack.push(name)
  const resolutionPathString = resolutionStack.join(' -> ')
  let msg = `Could not resolve '${name}'.`
  if (message) {
    msg += ` ${message}`
  }

  msg += EOL + EOL
  msg += `Resolution path: ${resolutionPathString}`

  return msg
}

/**
 * A nice error class so we can do an instanceOf check.
 */
class AwilixResolutionError extends ExtendableError {
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
  constructor (name, resolutionStack, message) {
    super(createErrorMessage(name, resolutionStack, message))
  }
}

module.exports = AwilixResolutionError
