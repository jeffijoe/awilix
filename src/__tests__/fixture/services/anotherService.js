class AnotherService {
  constructor(answerRepository) {
    this.repo = answerRepository
  }
}

module.exports.AnotherService = AnotherService

module.exports.default = function (deps) {
  return new AnotherService(deps.answerRepository)
}
