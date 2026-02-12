import { execSync } from 'child_process'
import * as path from 'path'
import { initResultsFile } from './helpers'

const benchmarks = [
  'resolve-simple',
  'resolve-deep-chain',
  'resolve-strict-mode',
  'scope-lookup',
  'injector-proxy',
  'realistic-app',
]

const ts = new Date().toISOString().replace(/[:.]/g, '-')
const resultsFile = path.join(__dirname, `RESULTS-${ts}.md`)

// Set env so child processes write to the same file
process.env.BENCH_RESULTS_FILE = resultsFile
initResultsFile()

const dir = __dirname

for (const name of benchmarks) {
  const file = path.join(dir, `${name}.ts`)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running: ${name}`)
  console.log('='.repeat(60))
  try {
    execSync(`npx tsx "${file}"`, {
      stdio: 'inherit',
      cwd: path.join(dir, '..'),
      env: { ...process.env, BENCH_RESULTS_FILE: resultsFile },
    })
  } catch {
    console.error(`Benchmark ${name} failed`)
  }
}

console.log(`\nResults written to ${path.basename(resultsFile)}`)
