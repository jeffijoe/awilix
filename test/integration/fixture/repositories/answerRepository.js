'use strict';

const THE_UNIVERSAL_ANSWER = 42;

module.exports.getAnswerFor = function(question) {
  return new Promise(resolve => {
    setTimeout(() => resolve(THE_UNIVERSAL_ANSWER), 10);
  });
};

module.exports.default = function(container) {
  container.register({
    answerRepository: container.bindAll({
      getAnswerFor: module.exports.getAnswerFor
    })
  });
};