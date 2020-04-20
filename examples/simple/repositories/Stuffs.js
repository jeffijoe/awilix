function StuffRepository({ database }) {
  console.log('StuffRepository created with database', database)
}

StuffRepository.prototype.getStuff = function (someArg) {
  return Promise.resolve({
    someProperty: someArg,
    secret: 'sshhhh!!!!!!!!!!',
  })
}

module.exports = (opts) => new StuffRepository(opts)
