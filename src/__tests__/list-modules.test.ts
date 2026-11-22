import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listModules } from '../list-modules.ts'

describe('listModules', () => {
  it('can find the modules in lib', () => {
    const result = listModules('../*.ts', { cwd: import.meta.dirname })
    assert.partialDeepStrictEqual(result, [{ name: 'container' }])
  })

  it('replaces Windows path separators with Posix path separators', () => {
    const result = listModules('..\\*.ts', { cwd: import.meta.dirname })
    assert.partialDeepStrictEqual(result, [{ name: 'container' }])
  })

  it('can find the modules in src without cwd', () => {
    const result = listModules('src/*.ts')
    assert.partialDeepStrictEqual(result, [{ name: 'container' }])
  })

  it('handles dots in module names', () => {
    const result = listModules('*.{ts,js}', { cwd: import.meta.dirname })
    assert.notStrictEqual(
      result.find((x) => x.name === 'container.test'),
      undefined,
    )
  })

  it('returns a path', () => {
    const result = listModules('../*.ts', { cwd: import.meta.dirname })
    const createContainerModule = result.find((x) => x.name === 'container')!
    assert.strictEqual(createContainerModule.name, 'container')
    assert.ok(createContainerModule.path.includes('container.ts'))
  })

  it('supports an array of globs', () => {
    const result = listModules(['src/*.ts'])
    const createContainerModule = result.find((x) => x.name === 'container')!
    assert.strictEqual(createContainerModule.name, 'container')
    assert.ok(createContainerModule.path.includes('container.ts'))
  })

  it('supports array-opts syntax', () => {
    const opts = { value: 'yep' }
    const result = listModules([['src/*.ts', opts as any]])

    const createContainerModule = result.find((x) => x.name === 'container')!
    assert.strictEqual(createContainerModule.name, 'container')
    assert.ok(createContainerModule.path.includes('container.ts'))
    assert.deepStrictEqual(createContainerModule.opts, opts)
  })
})
