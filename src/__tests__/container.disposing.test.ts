import { type AwilixContainer, createContainer } from '../container'
import { asClass, asFunction } from '../resolvers'
import { InjectionMode } from '../injection-mode'
import { DisposalMode } from '../disposal-mode'
import { Lifetime } from '../lifetime'

describe('disposing container', () => {
  it('disposes dependents before dependencies', async () => {
    const disposals: Array<string> = []
    const container = createContainer({
      injectionMode: InjectionMode.CLASSIC,
    }).register({
      outer: asFunction((inner) => ({
        dispose: async () => disposals.push('outer'),
      }))
        .singleton()
        .disposer((d) => d.dispose()),
      inner: asFunction(() => ({
        dispose: async () => disposals.push('inner'),
      }))
        .singleton()
        .disposer((d) => d.dispose()),
    })

    container.resolve('outer')
    await container.dispose()

    expect(disposals).toEqual(['outer', 'inner'])
  })

  it('when the scope is disposed directly, disposes scoped instances but does not dispose the root singletons', async () => {
    class TestClass {
      constructor(funcDisposer: unknown) {
        /**/
      }

      dispose() {
        /**/
      }
    }

    function testFunc(notDisposer: unknown) {
      return {
        destroy() {
          return Promise.resolve(42)
        },
      }
    }

    const order: Array<number> = []
    const container = createContainer({
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

    const scope = container.createScope().register({
      classDisposer: asClass(TestClass, {
        dispose: (t) => {
          order.push(1)
          return t.dispose()
        },
      }).scoped(),
    })

    scope.resolve('funcDisposer')
    scope.resolve('classDisposer')
    scope.resolve('scopedButRegedAtRoot')
    await scope.dispose()
    expect(order).toEqual([2, 1])
  })

  describe('disposal modes', () => {
    let container: AwilixContainer
    let disposeStart: Array<string>
    let disposeFinish: Array<string>
    let interceptOuter: ReturnType<typeof deferred>
    let interceptInner: ReturnType<typeof deferred>
    let innerStarted: ReturnType<typeof deferred>

    beforeEach(() => {
      disposeStart = []
      disposeFinish = []
      interceptOuter = deferred()
      interceptInner = deferred()
      innerStarted = deferred()
      container = createContainer({
        injectionMode: InjectionMode.CLASSIC,
      }).register({
        outer: asFunction((inner) => ({
          dispose: async () => {
            disposeStart.push('outer')
            await interceptOuter.promise
            disposeFinish.push('outer')
          },
        }))
          .singleton()
          .disposer((d) => d.dispose()),
        inner: asFunction(() => ({
          dispose: async () => {
            disposeStart.push('inner')
            void innerStarted.resolve(undefined)
            await interceptInner.promise
            disposeFinish.push('inner')
          },
        }))
          .singleton()
          .disposer((d) => d.dispose()),
      })
    })

    it('disposes concurrently by default', async () => {
      container.resolve('outer')

      const disposalPromise = container.dispose()

      expect(disposeStart).toEqual(['outer', 'inner'])
      expect(disposeFinish).toEqual([])

      await interceptInner.resolve(undefined)
      expect(disposeFinish).toEqual(['inner'])

      await interceptOuter.resolve(undefined)
      expect(disposeFinish).toEqual(['inner', 'outer'])

      await disposalPromise
    })

    it('disposes serially when requested', async () => {
      container.resolve('outer')

      const disposalPromise = container.dispose({ mode: DisposalMode.SERIAL })

      expect(disposeStart).toEqual(['outer'])
      expect(disposeFinish).toEqual([])

      await interceptOuter.resolve(undefined)
      expect(disposeFinish).toEqual(['outer'])

      await innerStarted.promise
      expect(disposeStart).toEqual(['outer', 'inner'])

      await interceptInner.resolve(undefined)
      expect(disposeFinish).toEqual(['outer', 'inner'])

      await disposalPromise
    })
  })

  it.each([DisposalMode.CONCURRENT, DisposalMode.SERIAL])(
    'keeps instances cached until their disposers finish in %s mode',
    async (mode) => {
      const loggerDisposal = deferred()
      const log: Array<string> = []
      let made = 0
      const container = createContainer().register({
        logger: asFunction(() => {
          made++
          return { write: (msg: string) => log.push(msg) }
        })
          .singleton()
          .disposer(async () => {
            await loggerDisposal.promise
            log.push('close')
          }),
        service: asFunction((cradle) => ({
          dispose: async () => {
            cradle.logger.write('service disposing')
            await loggerDisposal.promise
          },
        }))
          .singleton()
          .disposer((service) => service.dispose()),
        noDisposer: asFunction(() => ({})).singleton(),
      })

      // Cache `logger` first so serial disposal keeps it available for `service`.
      container.resolve('noDisposer')
      container.resolve('logger')
      container.resolve('service')
      const disposalPromise = container.dispose({ mode })

      expect(container.cache.has('logger')).toBe(true)
      expect(container.cache.has('service')).toBe(true)
      expect(log).toEqual(['service disposing'])

      await loggerDisposal.resolve(undefined)
      await disposalPromise

      expect(made).toBe(1)
      expect(log).toEqual(['service disposing', 'close'])
      expect(container.cache.size).toBe(0)
    },
  )

  it.each([Lifetime.SINGLETON, Lifetime.SCOPED, Lifetime.TRANSIENT])(
    'rejects uncached %s dependencies during disposal',
    async (lifetime) => {
      const factory = jest.fn(() => ({}))
      const container = createContainer().register({
        dependency: asFunction(factory).setLifetime(lifetime),
        service: asFunction(() => ({}))
          .singleton()
          .disposer(() => {
            // Resolving here would create an instance outside the disposal snapshot.
            container.resolve('dependency')
          }),
      })

      container.resolve('service')
      await expect(container.dispose()).rejects.toMatchObject({
        name: 'AggregateError',
        errors: [
          expect.objectContaining({
            message: expect.stringContaining(
              'Cannot resolve uncached dependencies while disposing.',
            ),
          }),
        ],
      })
      expect(factory).not.toHaveBeenCalled()
      expect(container.cache.size).toBe(0)
    },
  )

  it('rejects singleton resolutions through scopes after root disposal', async () => {
    const factory = jest.fn(() => ({}))
    const root = createContainer().register({
      dependency: asFunction(factory)
        .singleton()
        .disposer(() => {}),
      scoped: asFunction(() => ({})).scoped(),
    })

    // Use a nested scope to verify it still observes the original root's state.
    const scope = root.createScope().createScope()
    root.resolve('dependency')
    await root.dispose()

    expect(() => scope.resolve('dependency')).toThrow(
      "Cannot resolve new instance of 'dependency' because the root container has been disposed.",
    )
    expect(factory).toHaveBeenCalledTimes(1)
    expect(root.cache.size).toBe(0)

    // The scope is still active and can resolve its own scoped dependencies.
    expect(scope.resolve('scoped')).toEqual({})
    await scope.dispose()
  })

  it('only allows cached singletons through scopes during root disposal', async () => {
    const finish = deferred()
    const factory = jest.fn(() => ({}))
    const root = createContainer().register({
      cached: asFunction(() => ({}))
        .singleton()
        .disposer(() => finish.promise),
      uncached: asFunction(factory).singleton(),
    })
    const scope = root.createScope()
    const cached = root.resolve('cached')
    const disposalPromise = root.dispose()

    // Cached instances remain usable, but a scope must not repopulate the root cache.
    expect(scope.resolve('cached')).toBe(cached)
    expect(() => scope.resolve('uncached')).toThrow(
      'Cannot resolve uncached dependencies while disposing.',
    )
    expect(factory).not.toHaveBeenCalled()

    await finish.resolve(undefined)
    await disposalPromise
    expect(root.cache.size).toBe(0)
  })

  it('rejects overlapping disposal calls', async () => {
    const finish = deferred()
    let calls = 0
    const container = createContainer().register({
      service: asFunction(() => ({}))
        .singleton()
        .disposer(async () => {
          calls++
          await finish.promise
        }),
    })

    container.resolve('service')
    const disposalPromise = container.dispose()
    await expect(container.dispose()).rejects.toThrow(
      'Container disposal already in progress.',
    )
    expect(calls).toBe(1)

    await finish.resolve(undefined)
    await disposalPromise

    // Completed disposal is a no-op, but the container cannot be reused.
    await expect(container.dispose()).resolves.toBeUndefined()
    expect(calls).toBe(1)
    expect(() => container.resolve('service')).toThrow(
      'Container has been disposed.',
    )
  })

  it('rejects awaited re-entrant disposal', async () => {
    const container = createContainer().register({
      service: asFunction(() => ({}))
        .singleton()
        .disposer(async () => {
          // Throws because the container is already in the process of being disposed.
          await container.dispose()
        }),
    })

    container.resolve('service')
    await expect(container.dispose()).rejects.toMatchObject({
      name: 'AggregateError',
      errors: [
        expect.objectContaining({
          message: 'Container disposal already in progress.',
        }),
      ],
    })
    await expect(container.dispose()).resolves.toBeUndefined()
  })

  it.each([DisposalMode.CONCURRENT, DisposalMode.SERIAL])(
    'finishes disposal and aggregates errors in %s mode',
    async (mode) => {
      const syncError = new Error('sync')
      const asyncError = new Error('async')
      const disposed: Array<string> = []
      const successStarted = deferred()
      const finishSuccess = deferred()
      const container = createContainer().register({
        success: asFunction(() => ({}))
          .singleton()
          .disposer(async () => {
            // Hold cleanup open so we can verify disposal waits for it despite the errors.
            void successStarted.resolve(undefined)
            await finishSuccess.promise
            disposed.push('success')
          }),
        asyncFailure: asFunction(() => ({}))
          .singleton()
          .disposer(async () => {
            // Should be able to handle a rejected promise.
            await Promise.resolve()
            throw asyncError
          }),
        syncFailure: asFunction(() => ({}))
          .singleton()
          .disposer(() => {
            // ... as well as a synchronous error
            throw syncError
          }),
      })

      container.resolve('success')
      container.resolve('asyncFailure')
      container.resolve('syncFailure')

      // Trigger disposal.
      const disposalPromise = container.dispose({ mode }).catch((error) => {
        // Asserts that the overall dispose promise doesn't settle until
        // all the disposers have finished. If it settled earlier, then the
        // successful disposer wouldn't have modified the `disposed` array.
        expect(disposed).toEqual(['success'])
        throw error
      })

      // Wait for the disposer itself rather than relying on a fixed number of microtasks.
      await successStarted.promise
      await finishSuccess.resolve(undefined)

      // Assert that the errors were aggregated.
      await expect(disposalPromise).rejects.toMatchObject({
        name: 'AggregateError',
        errors: [syncError, asyncError],
      })
      expect(container.cache.size).toBe(0)

      // Failed disposal is also terminal; subsequent calls are a no-op.
      await expect(container.dispose({ mode })).resolves.toBeUndefined()
    },
  )
})

/**
 * Makes a deferred that can only be resolved.
 *
 * @returns
 */
function deferred<T = void>() {
  let resolve
  const promise = new Promise<T>((res, rej) => {
    resolve = res
  })

  return {
    promise,
    resolve(value: T) {
      const awaiter = promise.then()
      resolve!(value)
      return awaiter
    },
  }
}
