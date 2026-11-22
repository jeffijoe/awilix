import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  flatten,
  isClass,
  isFunction,
  last,
  nameValueToObject,
  uniq,
} from '../utils.ts'

describe('flatten', () => {
  it('flattens the array', () => {
    assert.deepStrictEqual(flatten([[1, 2], [3]]), [1, 2, 3])
  })
})

describe('isClass', () => {
  it('returns true for function that start with a capital letter', () => {
    assert.strictEqual(
      isClass(function Stuff() {
        /**/
      }),
      true,
    )
  })

  it('returns false for function that do not start with a capital letter', () => {
    assert.strictEqual(
      isClass(function stuff() {
        /**/
      }),
      false,
    )
  })

  it('returns false for other stuff', () => {
    assert.strictEqual(isClass('hello' as any), false)
    assert.strictEqual(isClass(123 as any), false)
  })

  it('returns true for classes', () => {
    assert.strictEqual(isClass(class Stuff {}), true)
    assert.strictEqual(isClass(class {}), true)
  })
})

describe('isFunction', () => {
  it('returns true when the value is a function', () => {
    assert.strictEqual(
      isFunction(() => {
        /**/
      }),
      true,
    )
    assert.strictEqual(
      isFunction(function () {
        /**/
      }),
      true,
    )
    assert.strictEqual(isFunction(class {}), true)
  })

  it('returns false when the value is not a function', () => {
    assert.strictEqual(isFunction(true), false)
    assert.strictEqual(isFunction(false), false)
    assert.strictEqual(isFunction(''), false)
    assert.strictEqual(isFunction('string'), false)
    assert.strictEqual(isFunction(123), false)
  })
})

describe('last', () => {
  it('returns the last element', () => {
    assert.strictEqual(last([1, 2, 3]), 3)
  })
})

describe('nameValueToObject', () => {
  it('converts 2 params to 1', () => {
    const result = nameValueToObject('hello', 'world')
    assert.strictEqual(typeof result, 'object')
    assert.strictEqual(result.hello, 'world')
  })

  it('uses the object if passed', () => {
    const input = { hello: 'world' }
    const result = nameValueToObject(input)

    assert.strictEqual(typeof result, 'object')
    assert.strictEqual(result.hello, 'world')
  })
})

describe('uniq', () => {
  it('returns unique items', () => {
    assert.deepStrictEqual(
      uniq(['hello', 'world', 'i', 'say', 'hello', 'world']),
      ['hello', 'world', 'i', 'say'],
    )
  })
})
