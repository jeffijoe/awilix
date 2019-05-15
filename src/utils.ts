import { createTokenizer } from './function-tokenizer'
import { Constructor } from './resolvers'

/**
 * Quick flatten utility to flatten a 2-dimensional array.
 *
 * @param  {Array<Array<Item>>} array
 * The array to flatten.
 *
 * @return {Array<Item>}
 * The flattened array.
 */
export function flatten<T>(array: Array<Array<T>>): Array<T> {
  const result: Array<T> = []
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
export function nameValueToObject(
  name: string | symbol | object,
  value?: any
): Record<string | symbol, any> {
  let obj = name
  if (typeof obj === 'string' || typeof obj === 'symbol') {
    return { [name as any]: value }
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
export function last<T>(arr: Array<T>): T {
  return arr[arr.length - 1]
}

/**
 * Determines if the given function is a class.
 *
 * @param  {Function} fn
 * @return {Boolean}
 */
export function isClass(fn: Function | Constructor<any>) {
  /*tslint:disable-next-line*/
  if (typeof fn !== 'function') {
    return false
  }

  // Should only need 2 tokens.
  const tokenizer = createTokenizer(fn.toString())
  const first = tokenizer.next()
  if (first.type === 'class') {
    return true
  }

  const second = tokenizer.next()
  if (first.type === 'function' && second.value) {
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
export function isFunction(val: any) {
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
export function uniq<T>(arr: Array<T>): Array<T> {
  const result: Array<T> = []
  for (const idx in arr) {
    const item = arr[idx]
    if (result.indexOf(item) === -1) {
      result.push(item)
    }
  }

  return result
}

/**
 * capitalizes the first letter of string
 *
 * @param {str}
 *
 * @return {str}
 *
 */
export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
