import { listModules } from '../list-modules'

describe('listModules', function() {
  it('can find the modules in lib', function() {
    const result = listModules('../*.ts', { cwd: __dirname })
    expect(result.some(x => x.name === 'container')).toBeTruthy()
  })

  it('can find the modules in src without cwd', function() {
    const result = listModules('src/*.ts')
    expect(result.some(x => x.name === 'container')).toBeTruthy()
  })

  it('handles dots in module names', function() {
    const result = listModules('*.{ts,js}', { cwd: __dirname })
    expect(result.find(x => x.name === 'container.test')).toBeDefined()
  })

  it('returns a path', function() {
    const result = listModules('../*.ts', { cwd: __dirname })
    const createContainerModule = result.find(x => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
  })

  it('supports an array of globs', function() {
    const result = listModules(['src/*.ts'])
    const createContainerModule = result.find(x => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
  })

  it('supports array-opts syntax', function() {
    const opts = { value: 'yep' }
    const result = listModules([['src/*.ts', opts as any]])

    const createContainerModule = result.find(x => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
    expect(createContainerModule.opts).toEqual(opts)
  })
})
