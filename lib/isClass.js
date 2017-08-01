const tokenizeFunction = require('./tokenizeFunction')

/**
 * Determines if the given function is a class.
 *
 * @param  {Function} fn
 * @return {Boolean}
 */
module.exports = function isClass (fn) {
  if (typeof fn !== 'function') {
    return false
  }

  // Should only need 2 tokens.
  const tokens = tokenizeFunction(fn.toString(), 2)
  const first = tokens[0]
  if (first.value === 'class') {
    return true
  }

  const second = tokens[1]
  if (first.value === 'function' && second.value) {
    if (second.value[0] === second.value[0].toUpperCase()) {
      return true
    }
  }

  return false
}
