import { createContainer, AwilixContainer } from '../src/container'
import { asFunction, asValue } from '../src/resolvers'
import { Lifetime } from '../src/lifetime'
import { Bench } from 'tinybench'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Creates a linear dependency chain: entry -> mid0 -> mid1 -> ... -> leaf.
 */
export function createLinearChain(
  depth: number,
  lifetime: string = Lifetime.TRANSIENT,
): AwilixContainer {
  const container = createContainer()
  const regs: Record<string, any> = {}

  // leaf
  regs['leaf'] = asFunction(() => 'value', { lifetime: lifetime as any })

  // mid(depth-2) -> ... -> mid0 -> entry
  for (let i = depth - 2; i >= 0; i--) {
    const next = i === depth - 2 ? 'leaf' : `mid${i + 1}`
    regs[`mid${i}`] = asFunction((cradle: any) => cradle[next], {
      lifetime: lifetime as any,
    })
  }

  // entry -> mid0
  const firstMid = depth > 1 ? 'mid0' : 'leaf'
  regs['entry'] = asFunction((cradle: any) => cradle[firstMid], {
    lifetime: lifetime as any,
  })

  container.register(regs)
  return container
}

/**
 * Creates a scope chain of given depth. Returns the deepest scope.
 */
export function createScopeChain(
  depth: number,
): { root: AwilixContainer; deepest: AwilixContainer } {
  const root = createContainer()
  root.register({ rootVal: asValue('from-root') })
  let current: AwilixContainer = root
  for (let i = 0; i < depth; i++) {
    current = current.createScope()
  }
  return { root, deepest: current }
}

/**
 * Formats bench results into a table for console + markdown.
 */
export function formatResults(bench: Bench): {
  rows: Array<{ Name: string; 'ops/sec': number; 'avg (ns)': number; 'p99 (ns)': number }>
  markdown: string
} {
  const rows = bench.tasks.map((t) => {
    const r = t.result as any
    return {
      Name: t.name,
      'ops/sec': Math.round(r.throughput.mean),
      'avg (ns)': Math.round(r.latency.mean * 1e6),
      'p99 (ns)': Math.round(r.latency.p99 * 1e6),
    }
  })

  let md = '| Name | ops/sec | avg (ns) | p99 (ns) |\n'
  md += '|------|---------|----------|----------|\n'
  for (const row of rows) {
    md += `| ${row.Name} | ${row['ops/sec'].toLocaleString()} | ${row['avg (ns)'].toLocaleString()} | ${row['p99 (ns)'].toLocaleString()} |\n`
  }

  return { rows, markdown: md }
}

let resultsFilePath: string | null = null

function getResultsPath(): string {
  if (!resultsFilePath) {
    // Allow parent process (run-all.ts) to set a shared filename via env var
    if (process.env.BENCH_RESULTS_FILE) {
      resultsFilePath = process.env.BENCH_RESULTS_FILE
    } else {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      resultsFilePath = path.join(__dirname, `RESULTS-${ts}.md`)
    }
  }
  return resultsFilePath
}

/**
 * Appends a section to the results markdown file.
 */
export function appendToResults(title: string, markdown: string): void {
  const section = `\n## ${title}\n\n${markdown}\n`
  fs.appendFileSync(getResultsPath(), section)
}

/**
 * Initializes the results file with a header and timestamp.
 */
export function initResultsFile(): void {
  const p = getResultsPath()
  const header = `# Benchmark Results\n\n**Timestamp:** ${new Date().toISOString()}\n**Node:** ${process.version}\n**Platform:** ${process.platform} ${process.arch}\n`
  fs.writeFileSync(p, header)
  console.log(`Results file: ${path.basename(p)}`)
}
