import { EOL } from 'os'
import { ResolutionStack } from './container'

/**
 * An extendable error class.
 * @author https://github.com/bjyoungblood/es6-error/
 */
export class ExtendableError extends Error {
  /**
   * Constructor for the error.
   *
   * @param  {String} message
   * The error message.
   */
  constructor(message: string) {
    super(message)

    // extending Error is weird and does not propagate `message`
    Object.defineProperty(this, 'message', {
      enumerable: false,
      value: message
    })

    Object.defineProperty(this, 'name', {
      enumerable: false,
      value: this.constructor.name
    })

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Base error for all Awilix-specific errors.
 */
export class AwilixError extends ExtendableError {}

/**
 * Error thrown to indicate a type mismatch.
 * TODO(v3): remove `AwilixNotAFunctionError` and use this.
 */
export class AwilixTypeError extends AwilixError {
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
  constructor(
    funcDescription: string,
    paramName: string,
    expectedType: string,
    givenType: any
  ) {
    super(
      `${funcDescription}: expected ${paramName} to be ${
        expectedType
      }, but got ${givenType}.`
    )
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
  static assert<T>(
    condition: T,
    funcDescription: string,
    paramName: string,
    expectedType: string,
    givenType: any
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
}

/**
 * A nice error class so we can do an instanceOf check.
 */
export class AwilixResolutionError extends AwilixError {
  /**
   * Constructor, takes the registered modules and unresolved tokens
   * to create a message.
   *
   * @param {string|symbol} name
   * The name of the module that could not be resolved.
   *
   * @param  {string[]} resolutionStack
   * The current resolution stack
   */
  constructor(
    name: string | symbol,
    resolutionStack: ResolutionStack,
    message?: string
  ) {
    if (typeof name === 'symbol') {
      name = (name as any).toString()
    }
    resolutionStack = resolutionStack.slice()
    resolutionStack.push(name)
    const resolutionPathString = resolutionStack.join(' -> ')
    let msg = `Could not resolve '${name}'.`
    if (message) {
      msg += ` ${message}`
    }

    msg += EOL + EOL
    msg += `Resolution path: ${resolutionPathString}`
    super(msg)
  }
}
