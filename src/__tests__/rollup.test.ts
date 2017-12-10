import * as path from 'path'
const cjs = require('../../lib/awilix')
const es = require('../../lib/awilix.module')
const umd = require('../../lib/awilix.umd')
const browser = require('../../lib/awilix.browser')

describe('rollup artifacts', () => {
  it('works', () => {
    expect(getValue(cjs)).toBe(123)
    expect(getValue(es)).toBe(123)
    expect(getValue(umd)).toBe(123)
    expect(getValue(browser)).toBe(123)
  })

  describe('non-browser builds', () => {
    it('support loadModules', async () => {
      const answer = 'The answer to "universe" is: 42'
      expect(await runLoadModules(cjs).getTheAnswer('universe')).toBe(answer)
      expect(await runLoadModules(es).getTheAnswer('universe')).toBe(answer)
    })
  })

  describe('browser build', () => {
    it('does not support loadModules', () => {
      expect(() => runLoadModules(umd)).toThrow(/browser/)
      expect(() => runLoadModules(browser)).toThrow(/browser/)
    })
  })
})

function getValue(pkg: any) {
  return pkg
    .createContainer()
    .register({
      value: pkg.asValue(123),
      fn: pkg.asFunction(({ value }: any) => value)
    })
    .resolve('fn')
}

function runLoadModules(pkg: any) {
  return pkg
    .createContainer()
    .register({ conn: pkg.asValue({}) })
    .loadModules(
      [
        ['services/*.js', pkg.Lifetime.SCOPED],
        ['repositories/*.js', { injector: () => ({ timeout: 10 }) }]
      ],
      {
        cwd: path.join(process.cwd(), 'src/__tests__/fixture')
      }
    )
    .resolve('mainService')
}
