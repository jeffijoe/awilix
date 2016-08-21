module.exports = function({ answerRepository }) {
  const getTheAnswer = function(question) {
    const repo = answerRepository
    return repo.getAnswerFor(question).then(theAnswer => {
      return `The answer to "${question}" is: ${theAnswer}`
    })
  }

  return {
    getTheAnswer
  }
}