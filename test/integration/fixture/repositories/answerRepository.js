const THE_UNIVERSAL_ANSWER = 42

module.exports = function({ timeout }) {
  /* istanbul ignore next */
  if (!timeout) {
    throw new Error('No timeout specified')
  }

  const getAnswerFor = function(question) {
    return new Promise(resolve => {
      setTimeout(() => resolve(THE_UNIVERSAL_ANSWER), timeout)
    })
  }

  return {
    getAnswerFor
  }
}
