/**
 * An extendable error class.
 * @author https://github.com/bjyoungblood/es6-error/
 */
class ExtendableError extends Error {
  /**
   * Constructor for the error.
   *
   * @param  {String} message
   * The error message.
   */
  constructor(message) {
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

module.exports = ExtendableError
