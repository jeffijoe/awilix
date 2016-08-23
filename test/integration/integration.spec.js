const AnotherService = require('./fixture/services/anotherService').AnotherService
const fixture = require('./fixture')
const Lifetime = require('../../lib/Lifetime')

describe('integration tests', function () {
  it('bootstraps everything so the answer can be resolved', function () {
    const container = fixture()
    const anotherService = container.resolve('anotherService')
    anotherService.should.be.an.instanceOf(AnotherService)
    anotherService.repo.should.be.an.object
    anotherService.repo.getAnswerFor.should.be.a.function
    Object.keys(container.registrations).length.should.equal(3)
  })

  it('registered all services as scoped', function () {
    const container = fixture()
    const scope1 = container.createScope()
    const scope2 = container.createScope()

    expect(container.registrations.mainService.lifetime).to.equal(Lifetime.SCOPED)
    expect(container.registrations.anotherService.lifetime).to.equal(Lifetime.SCOPED)
    expect(container.registrations.answerRepository.lifetime).to.equal(Lifetime.TRANSIENT)

    expect(scope1.resolve('mainService')).to.equal(scope1.resolve('mainService'))
    expect(scope1.resolve('mainService')).to.not.equal(scope2.resolve('mainService'))

    expect(scope1.resolve('anotherService')).to.equal(scope1.resolve('anotherService'))
    expect(scope1.resolve('anotherService')).to.not.equal(scope2.resolve('anotherService'))
  })
})
