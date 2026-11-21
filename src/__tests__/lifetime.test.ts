import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Lifetime, isLifetimeLonger } from '../lifetime.ts'

describe('isLifetimeLonger', () => {
  it('correctly compares lifetimes', () => {
    assert.strictEqual(
      isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.TRANSIENT),
      false,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.SCOPED),
      false,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.SINGLETON),
      false,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SCOPED, Lifetime.TRANSIENT),
      true,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SCOPED, Lifetime.SCOPED),
      false,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SCOPED, Lifetime.SINGLETON),
      false,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SINGLETON, Lifetime.TRANSIENT),
      true,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SINGLETON, Lifetime.SCOPED),
      true,
    )
    assert.strictEqual(
      isLifetimeLonger(Lifetime.SINGLETON, Lifetime.SINGLETON),
      false,
    )
  })
})
