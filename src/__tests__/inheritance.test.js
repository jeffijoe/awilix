import { createContainer } from '../../lib/container'
import { InjectionMode } from '../../lib/injection-mode'
import { asClass, asValue } from '../../lib/resolvers'

// NOTE: this test is in JS because TS won't allow the super(...arguments) trick.

test('parses parent classes if there are no declared parameters', () => {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC })

  class Level1 {
    constructor(level1Arg1, level1Arg2) {
      this.arg1 = level1Arg1
      this.arg2 = level1Arg2
    }
  }

  class Level2 extends Level1 {}

  class Level3 extends Level2 {
    constructor(level3Arg1) {
      super(...arguments)
    }
  }

  container.register({
    level1Arg1: asValue(1),
    level1Arg2: asValue(2),
    level3Arg1: asValue(4),
    level1: asClass(Level1),
    level2: asClass(Level2),
    level3: asClass(Level3),
  })

  expect(container.resolve('level1')).toEqual(
    expect.objectContaining({
      arg1: 1,
      arg2: 2,
    })
  )

  expect(container.resolve('level2')).toEqual(
    expect.objectContaining({
      arg1: 1,
      arg2: 2,
    })
  )

  expect(container.resolve('level3')).toEqual(
    expect.objectContaining({
      arg1: 4,
      arg2: undefined,
    })
  )
})
