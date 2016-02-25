'use strict';
module.exports.getTheAnswer = function(container, question) {
  const repo = container.answerRepository;
  return repo.getAnswerFor(question).then(theAnswer => {
    return `The answer to "${question}" is: ${theAnswer}`;
  });
};

module.exports.default = function(container) {
  // Prove that async container registrations work.
  return new Promise(resolve => {
    setTimeout(() => {
      container.register({
        mainService: container.bindAll({
          getTheAnswer: module.exports.getTheAnswer
        })
      });
      resolve();
    }, 10);
  });
};