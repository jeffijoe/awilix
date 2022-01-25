import { listModules } from '../../lib/list-modules'

describe('listModules', () => {
  it('can find the modules in lib', () => {
    const result = listModules('../*.ts', { cwd: __dirname })
    expect(result.some((x) => x.name === 'container')).toBeTruthy()
  })

  it('can find the modules in src without cwd', () => {
    const result = listModules('src/*.ts')
    expect(result.some((x) => x.name === 'container')).toBeTruthy()
  })

  it('handles dots in module names', () => {
    const result = listModules('*.{ts,js}', { cwd: __dirname })
    expect(result.find((x) => x.name === 'container.test')).toBeDefined()
  })

  it('returns a path', () => {
    const result = listModules('../*.ts', { cwd: __dirname })
    const createContainerModule = result.find((x) => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
  })

  it('supports an array of globs', () => {
    const result = listModules(['src/*.ts'])
    const createContainerModule = result.find((x) => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
  })

  it('supports array-opts syntax', () => {
    const opts = { value: 'yep' }
    const result = listModules([['src/*.ts', opts as any]])

    const createContainerModule = result.find((x) => x.name === 'container')!
    expect(createContainerModule.name).toBe('container')
    expect(createContainerModule.path).toContain('container.ts')
    expect(createContainerModule.opts).toEqual(opts)
  })
})
