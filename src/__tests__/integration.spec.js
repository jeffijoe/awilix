const AnotherService = require('./fixture/services/anotherService')
  .AnotherService
const fixture = require('./fixture')
const Lifetime = require('../Lifetime')

describe('integration tests', function() {
  it('bootstraps everything so the answer can be resolved', function() {
    const container = fixture()
    const anotherService = container.resolve('anotherService')
    expect(anotherService).toBeInstanceOf(AnotherService)
    expect(typeof anotherService.repo).toBe('object')
    expect(typeof anotherService.repo.getAnswerFor).toBe('function')
    expect(Object.keys(container.registrations).length).toBe(4)
  })

  it('registered all services as scoped', function() {
    const container = fixture()
    const scope1 = container.createScope()
    const scope2 = container.createScope()

    expect(container.registrations.mainService.lifetime).toBe(Lifetime.SCOPED)
    expect(container.registrations.anotherService.lifetime).toBe(
      Lifetime.SCOPED
    )
    expect(container.registrations.answerRepository.lifetime).toBe(
      Lifetime.TRANSIENT
    )

    expect(scope1.resolve('mainService')).toBe(scope1.resolve('mainService'))
    expect(scope1.resolve('mainService')).not.toBe(
      scope2.resolve('mainService')
    )

    expect(scope1.resolve('anotherService')).toBe(
      scope1.resolve('anotherService')
    )
    expect(scope1.resolve('anotherService')).not.toBe(
      scope2.resolve('anotherService')
    )
  })
})
