import { Bench } from 'tinybench'
import { createContainer } from '../src/container'
import { asFunction, asValue } from '../src/resolvers'
import { Lifetime } from '../src/lifetime'
import { formatResults, appendToResults } from './helpers'

/**
 * Simple Resolve benchmarks.
 *
 * Measures the baseline cost of resolve() with minimal dependency graphs.
 * Tests the core resolve hot path: registration lookup, cycle detection scan,
 * stack push/pop, and factory invocation.
 *
 * - transient: factory runs every call, no caching — pure resolve overhead
 * - singleton/scoped cache hit: measures how fast cached values are returned
 *   without re-invoking the factory
 * - 100 registrations: checks whether a large registration hash affects
 *   lookup speed (it shouldn't — it's a plain object property access)
 */

const bench = new Bench({ warmupIterations: 100, iterations: 1000 })

// --- Baseline: simple resolve (transient) ---
const simple = createContainer()
simple.register({
  a: asValue(1),
  b: asValue(2),
  sum: asFunction(({ a, b }: any) => a + b),
})

bench.add('resolve transient (3 registrations)', () => {
  simple.resolve('sum')
})

// --- Singleton resolve (cached) ---
const singleton = createContainer()
singleton.register({
  val: asValue(42),
  cached: asFunction(({ val }: any) => val, {
    lifetime: Lifetime.SINGLETON,
  }),
})
singleton.resolve('cached') // prime the cache

bench.add('resolve singleton (cache hit)', () => {
  singleton.resolve('cached')
})

// --- Scoped resolve (cached) ---
const scoped = createContainer()
scoped.register({
  val: asValue(42),
  cached: asFunction(({ val }: any) => val, { lifetime: Lifetime.SCOPED }),
})
const scope = scoped.createScope()
scope.resolve('cached') // prime

bench.add('resolve scoped (cache hit)', () => {
  scope.resolve('cached')
})

// --- Many registrations ---
const big = createContainer()
const bigRegs: Record<string, any> = {}
for (let i = 0; i < 100; i++) {
  bigRegs[`dep${i}`] = asValue(i)
}
bigRegs['target'] = asFunction(({ dep50 }: any) => dep50)
big.register(bigRegs)

bench.add('resolve transient (100 registrations)', () => {
  big.resolve('target')
})

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Simple Resolve ===')
  console.table(rows)
  appendToResults('Simple Resolve', markdown)
})
