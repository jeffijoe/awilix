/**
 * This is an example of a "classical" service,
 * meaning that the service is actually a class
 * that takes it's dependencies in the constructor.
 */

// Use classes, prototypes, whatever you want.
// Using class here for demo purposes. Java and .NET devs will
// feel right at home.
class ClassicalService {
  // Classic example of constructor injection.
  constructor(opts) {
    this.functionalService = opts.functionalService
  }

  // The awesome method we're calling in index.js.
  actAllCool() {
    // Look ma'! No require!
    return this.functionalService
      .getStuffAndDeleteSecret('be cool')
      .then(stuff => {
        stuff.isCool = true
        return stuff
      })
  }
}

module.exports = ClassicalService
