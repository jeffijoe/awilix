import { Bench } from 'tinybench'
import { asValue } from '../src/resolvers'
import { createScopeChain, formatResults, appendToResults } from './helpers'

/**
 * Scope Lookup benchmarks.
 *
 * Measures the cost of resolving a registration defined on a parent
 * container from a deeply nested child scope. When a registration is
 * not found locally, getRegistration() walks up the parent chain
 * recursively. Deeper scope nesting = more recursive calls.
 *
 * - "first call": creates a fresh scope chain each iteration, so there
 *   is no cached value. Measures scope creation + parent chain walk +
 *   factory invocation.
 *
 * - "cached": resolves the same value from a pre-existing scope.
 *   The value is already cached (asValue produces a value resolver),
 *   so this measures how fast resolve() returns a cached result
 *   when the registration lives on a parent container.
 *
 * - "re-register": the root re-registers the same name before each
 *   resolve, forcing the child to walk up and find the new registration.
 *   Measures the cost of registration changes propagating through scopes.
 *
 * - "hasRegistration": checks existence without resolving. Same parent
 *   chain walk as getRegistration(), but no factory invocation.
 */

const bench = new Bench({ warmupIterations: 100, iterations: 1000 })

for (const depth of [1, 3, 6, 10]) {
  bench.add(`resolve from root, scope depth=${depth} (first call)`, () => {
    // Each iteration creates a fresh chain to measure uncached lookup
    const { deepest: d } = createScopeChain(depth)
    d.resolve('rootVal')
  })
}

for (const depth of [1, 3, 6, 10]) {
  const { deepest } = createScopeChain(depth)
  deepest.resolve('rootVal') // prime the cache

  bench.add(`resolve from root, scope depth=${depth} (cached)`, () => {
    deepest.resolve('rootVal')
  })
}

// Measure cache invalidation cost
const { root, deepest: deep10 } = createScopeChain(10)
deep10.resolve('rootVal') // prime

bench.add('resolve after parent re-register, depth=10', () => {
  root.register({ rootVal: asValue('updated') })
  deep10.resolve('rootVal')
})

// hasRegistration also benefits from cached lookup
for (const depth of [1, 6]) {
  const { deepest } = createScopeChain(depth)
  deepest.resolve('rootVal') // prime

  bench.add(`hasRegistration, scope depth=${depth}`, () => {
    deepest.hasRegistration('rootVal')
  })
}

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Scope Lookup Cache ===')
  console.table(rows)
  appendToResults('Scope Lookup Cache', markdown)
})
