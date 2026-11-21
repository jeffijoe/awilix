const THE_UNIVERSAL_ANSWER = 42

module.exports = function ({ timeout, conn }) {
  if (!timeout) {
    throw new Error('No timeout specified')
  }

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
