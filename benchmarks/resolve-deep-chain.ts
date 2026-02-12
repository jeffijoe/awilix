import { Bench } from 'tinybench'
import { createLinearChain, formatResults, appendToResults } from './helpers'

/**
 * Deep Chain Resolve benchmarks.
 *
 * Measures resolve cost as the dependency chain depth increases.
 * Each resolve triggers a cascade of nested resolve() calls
 * (entry -> mid0 -> mid1 -> ... -> leaf), all transient.
 *
 * This stresses cycle detection — at each level, the resolution stack
 * is scanned linearly to check for duplicates. Total scan work grows
 * quadratically: O(1+2+...+n) = O(n^2). Since all dependencies are
 * transient, no caching kicks in — every resolve invokes its factory.
 *
 * Depths beyond 10 are unrealistic for real applications where services
 * are typically scoped or singleton, and dependency graphs are wide
 * rather than deep.
 */

const bench = new Bench({ warmupIterations: 100, iterations: 1000 })

for (const depth of [3, 5, 10]) {
  const container = createLinearChain(depth)

  bench.add(`resolve chain depth=${depth}`, () => {
    container.resolve('entry')
  })
}

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Deep Chain Resolve ===')
  console.table(rows)
  appendToResults('Deep Chain Resolve', markdown)
})
