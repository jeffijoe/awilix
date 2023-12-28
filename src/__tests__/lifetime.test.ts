import { Lifetime, isLifetimeLonger } from '../lifetime'

describe('isLifetimeLonger', () => {
  it('correctly compares lifetimes', () => {
    expect(isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.TRANSIENT)).toBe(false)
    expect(isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.SCOPED)).toBe(false)
    expect(isLifetimeLonger(Lifetime.TRANSIENT, Lifetime.SINGLETON)).toBe(false)
    expect(isLifetimeLonger(Lifetime.SCOPED, Lifetime.TRANSIENT)).toBe(true)
    expect(isLifetimeLonger(Lifetime.SCOPED, Lifetime.SCOPED)).toBe(false)
    expect(isLifetimeLonger(Lifetime.SCOPED, Lifetime.SINGLETON)).toBe(false)
    expect(isLifetimeLonger(Lifetime.SINGLETON, Lifetime.TRANSIENT)).toBe(true)
    expect(isLifetimeLonger(Lifetime.SINGLETON, Lifetime.SCOPED)).toBe(true)
    expect(isLifetimeLonger(Lifetime.SINGLETON, Lifetime.SINGLETON)).toBe(false)
  })
})
