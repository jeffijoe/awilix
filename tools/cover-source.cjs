const { spawnSync } = require('node:child_process')
const { mkdirSync } = require('node:fs')

mkdirSync('coverage', { recursive: true })

const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--experimental-test-coverage',
    '--test-coverage-include=src/*.ts',
    '--test-coverage-exclude=src/awilix.ts',
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100',
    '--test-reporter=spec',
    '--test-reporter=lcov',
    '--test-reporter-destination=stdout',
    '--test-reporter-destination=coverage/lcov.info',
    'src/__tests__/**/*.test.{ts,js}',
  ],
  { stdio: 'inherit' },
)

if (result.error) throw result.error
process.exitCode = result.status ?? 1
