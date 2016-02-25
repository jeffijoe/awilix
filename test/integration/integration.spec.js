'use strict';


const AnotherService = require('./fixture/services/AnotherService').AnotherService;
const fixture = require('./fixture');

describe('integration tests', function() {
  it('bootstraps everything so the answer can be resolved', function() {
    return fixture().then(container => {
      expect(container.answerRepository).to.exist;
      expect(container.mainService).to.exist;
      expect(container.anotherService).to.exist;
      expect(container.anotherService.repo).to.exist;
      container.anotherService.should.be.instanceOf(AnotherService);
      container.anotherService.repo.should.equal(container.answerRepository);

      return container.mainService.getTheAnswer('life, the universe and everything');
    }).then(theAnswer => {
      theAnswer.should.equal('The answer to "life, the universe and everything" is: 42');
    });
  });
});