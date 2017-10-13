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
module.exports = function nameValueToObject(name, value) {
  let obj = name
  if (typeof obj === 'string') {
    obj = Object.assign({ [name]: value })
  }

  return obj
}
