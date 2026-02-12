import { Bench } from 'tinybench'
import { createContainer } from '../src/container'
import { asFunction, asValue } from '../src/resolvers'
import { Lifetime } from '../src/lifetime'
import { formatResults, appendToResults } from './helpers'

/**
 * Strict Mode Lifetime Check benchmarks.
 *
 * Measures the overhead of strict mode's lifetime leak detection.
 * In strict mode, every resolve() scans the resolution stack to check
 * whether any ancestor has a longer lifetime than the current dependency
 * (e.g., a singleton depending on a transient — a "lifetime leak").
 *
 * - "no violation" cases: the entire stack is scanned and no violation
 *   is found. This is the common path — measures the per-resolve cost
 *   of the safety check itself. Uses singletons so each depth requires
 *   a fresh container (singletons are cached after first resolve).
 *
 * - strict=true vs strict=false on same transient chain: isolates the
 *   marginal cost of enabling strict mode. Both chains are identical
 *   except for the strict flag, so the difference is purely the
 *   lifetime check overhead.
 */

const bench = new Bench({ warmupIterations: 100, iterations: 1000 })

function buildStrictChain(depth: number) {
  const container = createContainer({ strict: true })
  const regs: Record<string, any> = {}

  regs['leaf'] = asValue('value')

  for (let i = depth - 2; i >= 0; i--) {
    const next = i === depth - 2 ? 'leaf' : `mid${i + 1}`
    regs[`mid${i}`] = asFunction((cradle: any) => cradle[next], {
      lifetime: Lifetime.SINGLETON,
    })
  }

  const firstMid = depth > 1 ? 'mid0' : 'leaf'
  regs['entry'] = asFunction((cradle: any) => cradle[firstMid], {
    lifetime: Lifetime.SINGLETON,
  })

  container.register(regs)
  return container
}

for (const depth of [5, 10, 25]) {
  bench.add(`strict mode chain depth=${depth} (no violation)`, () => {
    // Create fresh container each time since singletons get cached
    const c = buildStrictChain(depth)
    c.resolve('entry')
  })
}

// Compare strict vs non-strict on same transient chain shape
function buildTransientChain(depth: number, strict: boolean) {
  const c = createContainer({ strict })
  const regs: Record<string, any> = {}
  regs['leaf'] = asValue('v')
  for (let i = depth - 2; i >= 0; i--) {
    const next = i === depth - 2 ? 'leaf' : `mid${i + 1}`
    regs[`mid${i}`] = asFunction((cradle: any) => cradle[next])
  }
  const firstMid = depth > 1 ? 'mid0' : 'leaf'
  regs['entry'] = asFunction((cradle: any) => cradle[firstMid])
  c.register(regs)
  return c
}

const nonStrict10 = buildTransientChain(10, false)
const strict10 = buildTransientChain(10, true)

bench.add('depth=10 transients, strict=false', () => {
  nonStrict10.resolve('entry')
})

bench.add('depth=10 transients, strict=true', () => {
  strict10.resolve('entry')
})

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Strict Mode Lifetime Check ===')
  console.table(rows)
  appendToResults('Strict Mode Lifetime Check', markdown)
})
