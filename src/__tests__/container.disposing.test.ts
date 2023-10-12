import { createContainer } from '../container'
import { asClass, asFunction } from '../resolvers'
import { InjectionMode } from '../injection-mode'
import { AwilixContainer } from '../awilix'

class TestClass {
  constructor(funcDisposer: TestFunc) {
    /**/
  }

  dispose() {
    /**/
  }
}

interface TestFunc {
  destroy(): Promise<number>
}

function testFunc(notDisposer: object): TestFunc {
  return {
    destroy() {
      return Promise.resolve(42)
    },
  }
}

describe('disposing container', () => {
  let order: Array<number>
  let container: AwilixContainer
  let scope: AwilixContainer
  beforeEach(() => {
    order = []
    container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    }).register({
      notDisposer: asFunction(() => ({})).scoped(),
      scopedButRegedAtRoot: asFunction(testFunc)
        .scoped()
        .disposer((t) => {
          order.push(2)
          return t.destroy()
        }),
      funcDisposer: asFunction(testFunc)
        .singleton()
        .disposer((t) => {
          order.push(2)
          return t.destroy()
        }),
    })

    scope = container.createScope().register({
      classDisposer: asClass(TestClass, {
        dispose: (t) => {
          order.push(1)
          return t.dispose()
        },
      }).scoped(),
    })
  })

  it('calls the disposers in the correct order', async () => {
    scope.resolve('funcDisposer')
    scope.resolve('classDisposer')
    await container.dispose()
    expect(order).toEqual([2])
  })

  it('when the scope is disposed directly, disposes scoped instances but does not dispose the root singletons', async () => {
    scope.resolve('funcDisposer')
    scope.resolve('classDisposer')
    scope.resolve('scopedButRegedAtRoot')
    await scope.dispose()
    expect(order).toEqual([1, 2])
  })
})
