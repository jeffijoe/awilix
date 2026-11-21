const assert = require('node:assert/strict')
const { test } = require('node:test')
const path = require('node:path')
const { runInNewContext } = require('node:vm')
const ts = require('typescript')

const cjs = require('../lib/awilix.js')
const umd = require('../lib/awilix.umd.js')
const esm = import('../lib/awilix.module.mjs')
const browser = import('../lib/awilix.browser.mjs')

test('all builds resolve a dependency', async () => {
  for (const pkg of [cjs, await esm, umd, await browser]) {
    const container = pkg.createContainer().register({
      value: pkg.asValue(123),
      proxy: pkg.asFunction(({ value }) => value),
      classic: pkg
        .asFunction(function (value) {
          return value
        })
        .classic(),
    })
    assert.strictEqual(container.resolve('proxy'), 123)
    assert.strictEqual(container.resolve('classic'), 123)
  }
})

test('Node builds inject TypeScript constructor parameter properties', async () => {
  const { outputText } = ts.transpileModule(
    'class Service { constructor(public val: object, public fn: () => number) {} }',
    { compilerOptions: { target: ts.ScriptTarget.ES2021 } },
  )
  const Service = runInNewContext(outputText + '\nService')
  const val = {}
  const fn = () => 42

  for (const pkg of [cjs, await esm]) {
    const container = pkg.createContainer().register({
      val: pkg.asValue(val),
      fn: pkg.asValue(fn),
      service: pkg.asClass(Service).classic(),
    })

    const service = container.resolve('service')
    assert.strictEqual(service.val, val)
    assert.strictEqual(service.fn, fn)
  }
})

test('Node builds load modules through their supported APIs', async () => {
  const answer = 'The answer to "universe" is: 42'
  const commonJSContainer = loadModules(cjs)
  const esmContainer = await loadModules(await esm, { esModules: true })

  for (const container of [commonJSContainer, esmContainer]) {
    const service = container.resolve('mainService')
    assert.strictEqual(await service.getTheAnswer('universe'), answer)
  }
})

test('Node builds load ESM fixtures with top-level await', async () => {
  for (const pkg of [cjs, await esm]) {
    const container = pkg.createContainer()
    await container.loadModules(['asyncValue.mjs'], {
      cwd: path.join(__dirname, 'fixtures'),
      esModules: true,
    })
    assert.strictEqual(container.resolve('asyncValue'), 42)
  }
})

test('browser builds reject module loading', async () => {
  assert.throws(() => loadModules(umd), /browser/)
  const browserPackage = await browser
  assert.throws(() => loadModules(browserPackage), /browser/)
})

function loadModules(pkg, options) {
  return pkg
    .createContainer()
    .register({ conn: pkg.asValue({}) })
    .loadModules(
      [
        ['services/*.js', pkg.Lifetime.SCOPED],
        ['repositories/*.js', { injector: () => ({ timeout: 10 }) }],
      ],
      { cwd: path.join(__dirname, '../src/__tests__/fixture'), ...options },
    )
}
