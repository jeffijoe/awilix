'use strict';
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
  constructor(functionalService) {
    this.functionalService = functionalService;
  }

  // The awesome method we're calling in index.js.
  actAllCool() {
    // Look ma'! No require!
    return this.functionalService.getStuffAndDeleteSecret('be cool').then(stuff => {
      stuff.isCool = true;
      return stuff;
    });
  }
}

// So to test the above, you could do something like...
//
// const mock = {
//   getStuffAndDeleteSecret: spy(() => Promise.resolve({ }))
// }
// const service = new ClassicalService(mock)
// service.actAllCool.then(result => {
//   mock.getStuffAndDeleteSecret.should.have.been.calledWith('be cool');
//   .... etc etc
// });
//
// Easy, yeah?

// Also, we are exporting it so we can write tests for it!
module.exports.ClassicalService = ClassicalService;

// Now, the default export must satisfy the Awilix bootstrapping pattern.
// Because this isn't our only export, we have to use exports.default.
// NOTE: When using ES6 import-export, you can simply use `export default`.
module.exports.default = function (container) {
  // So we get the container as the first argument,
  // but since we want to be explicit about our dependencies,
  // we have to declare what we need, so the container can
  // call us back when it's ready.
  container.dependsOn(['functionalService'], () => {
    // NOTE: We can return a promise from this callback,
    // and if you are deferring registration you **MUST**
    // return a promise.
    //
    // Alrighty, we now know that `functionalService` is ready,
    // so lets register this module's "public API".
    //
    // `register` will make this module available on the container.
    container.register({
      // So since we're using classes, we want to
      // register an instance of our service,
      // configured with an actual implementation of
      // functionalService. As stated above, we now know
      // for a fact that functionalService is ready!
      classicalService: new ClassicalService(container.functionalService)

      // NOTE: Instead of specifying each dependency,
      // you can simply inject the container itself into
      // the constructor.
    });
  });
};