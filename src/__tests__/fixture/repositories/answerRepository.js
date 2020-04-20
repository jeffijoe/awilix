const THE_UNIVERSAL_ANSWER = 42

module.exports = function ({ timeout, conn }) {
  /* istanbul ignore next */
  if (!timeout) {
    throw new Error('No timeout specified')
  }

  /* istanbul ignore next */
  if (!conn) {
    throw new Error('No conn specified')
  }

  const getAnswerFor = function (question) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(THE_UNIVERSAL_ANSWER), timeout)
    })
  }

  return {
    getAnswerFor,
  }
}
