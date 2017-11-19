const listModules = require('../listModules')

describe('listModules', function() {
  it('can find the modules in lib', function() {
    const result = listModules('../*.js', { cwd: __dirname })
    expect(result.some(x => x.name === 'createContainer')).toBeTruthy()
  })

  it('can find the modules in src without cwd', function() {
    const result = listModules('src/*.js')
    expect(result.some(x => x.name === 'createContainer')).toBeTruthy()
  })

  it('handles dots in module names', function() {
    const result = listModules('*.js', { cwd: __dirname })
    const createContainerSpec = result.find(
      x => x.name === 'createContainer.spec'
    )
    expect(createContainerSpec.name).toBe('createContainer.spec')
  })

  it('returns a path', function() {
    const result = listModules('../*.js', { cwd: __dirname })
    const createContainerModule = result.find(x => x.name === 'createContainer')
    expect(createContainerModule.name).toBe('createContainer')
    expect(createContainerModule.path).toContain('createContainer.js')
  })

  it('supports an array of globs', function() {
    const result = listModules(['src/*.js'])
    const createContainerModule = result.find(x => x.name === 'createContainer')
    expect(createContainerModule.name).toBe('createContainer')
    expect(createContainerModule.path).toContain('createContainer.js')
  })

  it('supports array-opts syntax', function() {
    const opts = { value: 'yep' }
    const result = listModules([['src/*.js', opts]])

    const createContainerModule = result.find(x => x.name === 'createContainer')
    expect(createContainerModule.name).toBe('createContainer')
    expect(createContainerModule.path).toContain('createContainer.js')
    expect(createContainerModule.opts).toEqual(opts)
  })
})
