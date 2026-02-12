import { Bench } from 'tinybench'
import { createContainer } from '../src/container'
import { asClass, asValue } from '../src/resolvers'
import { formatResults, appendToResults } from './helpers'

/**
 * Injector Proxy benchmarks.
 *
 * Measures the cost of resolving a class that uses .inject() to provide
 * local overrides. When inject() is used, awilix creates a proxy that
 * merges the container's registrations with the injected locals. The
 * constructor receives this proxy as its cradle, and calling
 * Object.keys(cradle) enumerates all available keys (both container
 * registrations and injected locals, deduplicated).
 *
 * This benchmark stresses the key enumeration path: how the proxy
 * collects keys from the container's registrations and the local
 * injection object, deduplicates them, and exposes them via ownKeys().
 * The cost scales with the number of registrations since all keys
 * must be collected and deduplicated.
 *
 * Tested at 5, 50, and 200 registrations to show how key enumeration
 * cost scales with container size.
 */

const bench = new Bench({ warmupIterations: 100, iterations: 1000 })

class Consumer {
  keys: string[]
  injected: any
  constructor(cradle: any) {
    this.keys = Object.keys(cradle)
    this.injected = cradle.injected
  }
}

// Small container (5 registrations)
const small = createContainer()
small.register({
  val1: asValue(1),
  val2: asValue(2),
  consumer: asClass(Consumer).inject(() => ({
    injected: true,
    val1: 'overridden',
  })),
})

bench.add('injector proxy resolve (5 regs)', () => {
  small.resolve('consumer')
})

// Medium container (50 registrations)
const med = createContainer()
const medRegs: Record<string, any> = {}
for (let i = 0; i < 50; i++) {
  medRegs[`dep${i}`] = asValue(i)
}
medRegs['consumer'] = asClass(Consumer).inject(() => ({
  injected: true,
  dep0: 'overridden',
}))
med.register(medRegs)

bench.add('injector proxy resolve (50 regs)', () => {
  med.resolve('consumer')
})

// Large container (200 registrations)
const big = createContainer()
const bigRegs: Record<string, any> = {}
for (let i = 0; i < 200; i++) {
  bigRegs[`dep${i}`] = asValue(i)
}
bigRegs['consumer'] = asClass(Consumer).inject(() => ({
  injected: true,
  dep0: 'overridden',
}))
big.register(bigRegs)

bench.add('injector proxy resolve (200 regs)', () => {
  big.resolve('consumer')
})

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Injector Proxy ===')
  console.table(rows)
  appendToResults('Injector Proxy', markdown)
})
