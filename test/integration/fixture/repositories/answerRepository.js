const THE_UNIVERSAL_ANSWER = 42;

module.exports.default = function() {
  const getAnswerFor = function(question) {
    return new Promise(resolve => {
      setTimeout(() => resolve(THE_UNIVERSAL_ANSWER), 10);
    });
  };

  return {
    getAnswerFor
  };
};