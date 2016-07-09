const AnotherService = require('./fixture/services/anotherService').AnotherService;
const fixture = require('./fixture');

describe('integration tests', function() {
  it('bootstraps everything so the answer can be resolved', function () {
    const container = fixture();
    const anotherService = container.resolve('anotherService');
    anotherService.should.be.an.instanceOf(AnotherService);
    anotherService.repo.should.be.an.object;
    anotherService.repo.getAnswerFor.should.be.a.function;
    Object.keys(container.registrations).length.should.equal(3);
  });
});