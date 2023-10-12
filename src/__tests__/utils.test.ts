import {
  flatten,
  isClass,
  isFunction,
  last,
  nameValueToObject,
  uniq,
} from '../utils'

describe('flatten', () => {
  it('flattens the array', () => {
    expect(flatten([[1, 2], [3]])).toEqual([1, 2, 3])
  })
})

describe('isClass', () => {
  it('returns true for function that start with a capital letter', () => {
    expect(
      isClass(function Stuff() {
        /**/
      }),
    ).toBe(true)
  })

  it('returns false for function that do not start with a capital letter', () => {
    expect(
      isClass(function stuff() {
        /**/
      }),
    ).toBe(false)
  })

  it('returns false for other stuff', () => {
    expect(isClass('hello' as any)).toBe(false)
    expect(isClass(123 as any)).toBe(false)
  })

  it('returns true for classes', () => {
    expect(isClass(class Stuff {})).toBe(true)
    expect(isClass(class {})).toBe(true)
  })
})

describe('isFunction', () => {
  it('returns true when the value is a function', () => {
    expect(
      isFunction(() => {
        /**/
      }),
    ).toBe(true)
    expect(
      isFunction(function () {
        /**/
      }),
    ).toBe(true)
    expect(isFunction(class {})).toBe(true)
  })

  it('returns false when the value is not a function', () => {
    expect(isFunction(true)).toBe(false)
    expect(isFunction(false)).toBe(false)
    expect(isFunction('')).toBe(false)
    expect(isFunction('string')).toBe(false)
    expect(isFunction(123)).toBe(false)
  })
})

describe('last', () => {
  it('returns the last element', () => {
    expect(last([1, 2, 3])).toBe(3)
  })
})

describe('nameValueToObject', () => {
  it('converts 2 params to 1', () => {
    const result = nameValueToObject('hello', 'world')
    expect(typeof result).toBe('object')
    expect(result.hello).toBe('world')
  })

  it('uses the object if passed', () => {
    const input = { hello: 'world' }
    const result = nameValueToObject(input)

    expect(typeof result).toBe('object')
    expect(result.hello).toBe('world')
  })
})

describe('uniq', () => {
  it('returns unique items', () => {
    expect(uniq(['hello', 'world', 'i', 'say', 'hello', 'world'])).toEqual([
      'hello',
      'world',
      'i',
      'say',
    ])
  })
})
