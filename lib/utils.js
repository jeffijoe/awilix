const tokenizeFunction = require('./tokenizeFunction')

/**
 * Quick flatten utility to flatten a 2-dimensional array.
 *
 * @param  {Array<Array<Item>>} array
 * The array to flatten.
 *
 * @return {Array<Item>}
 * The flattened array.
 */
module.exports.flatten = function flatten(array) {
  const result = []
  array.forEach(arr => {
    arr.forEach(item => {
      result.push(item)
    })
  })

  return result
}

/**
 * Creates a { name: value } object if the input isn't already in that format.
 *
 * @param  {string|object} name
 * Either a string or an object.
 *
 * @param  {*} value
 * The value, only used if name is not an object.
 *
 * @return {object}
 */
module.exports.nameValueToObject = function nameValueToObject(name, value) {
  let obj = name
  if (typeof obj === 'string' || typeof obj === 'symbol') {
    obj = Object.assign({ [name]: value })
  }

  return obj
}

/**
 * Returns the last item in the array.
 *
 * @param  {*[]} arr
 * The array.
 *
 * @return {*}
 * The last element.
 */
module.exports.last = function last(arr) {
  return arr[arr.length - 1]
}

/**
 * Determines if the given function is a class.
 *
 * @param  {Function} fn
 * @return {Boolean}
 */
module.exports.isClass = function isClass(fn) {
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

/**
 * Determines if the given value is a function.
 *
 * @param  {Any} val
 * Any value to check if it's a function.
 *
 * @return {Boolean}
 * true if the value is a function, false otherwise.
 */
module.exports.isFunction = function isFunction(val) {
  return typeof val === 'function'
}

/**
 * Returns the unique items in the array.
 *
 * @param {Array<T>}
 * The array to remove dupes from.
 *
 * @return {Array<T>}
 * The deduped array.
 */
module.exports.uniq = function uniq(arr) {
  const result = []
  for (const idx in arr) {
    const item = arr[idx]
    if (result.indexOf(item) === -1) {
      result.push(item)
    }
  }

  return result
}
