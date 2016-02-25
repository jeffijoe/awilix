'use strict';

class AnotherService {
  constructor(answerRepository) {
    this.repo = answerRepository;
  }
}

module.exports.AnotherService = AnotherService;

module.exports.default = function(container) {
  return container.dependsOn(['answerRepository'], () => {
    container.register({
      anotherService: new AnotherService(container.answerRepository)
    });
  });
};