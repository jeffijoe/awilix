/**
 * Quick flatten utility to flatten a 2-dimensional array.
 *
 * @param  {Array<Array<Item>>} array
 * The array to flatten.
 *
 * @return {Array<Item>}
 * The flattened array.
 */
module.exports = function flatten(array) {
  const result = []
  array.forEach(arr => {
    arr.forEach(item => {
      result.push(item)
    })
  })

  return result
}