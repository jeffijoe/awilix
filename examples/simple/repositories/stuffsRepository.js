'use strict';
function StuffRepository() {
}

module.exports.StuffRepository = StuffRepository;

StuffRepository.prototype.getStuff = function(someArg) {
  return Promise.resolve({
    someProperty: someArg,
    secret: 'sshhhh!!!!!!!!!!'
  });
};

// Register the repository with the container.
module.exports.default = function (container) {
  container.register({
    // No dependencies.
    stuffs: new StuffRepository()
  });
}