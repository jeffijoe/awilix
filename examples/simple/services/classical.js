'use strict';
/**
 * This is an example of a "functional" service,
 * meaning that instead of exporting a class,
 * you export each function instead.
 *
 * Functions might depend on other things, so we will
 * use `container.bindAll` and `container.register`
 * to hook them up. When this is done, whenever
 * the functions are called, their first parameter
 * will always be the container itself.
 */

// Use classes, prototypes, whatever you want.
// Using class here for demoing.
class ClassicalService {
  // Classical example of constructor injection.
  constructor(functionalService) {
    this.functionalService = functionalService;
  }

  // The awesome method we're calling in index.js.
  actAllCool() {
    return this.functionalService.getStuffAndDeleteSecret('be cool').then(stuff => {
      stuff.isCool = true;
      return stuff;
    });
  }
}

// Also, we are exporting it so we can write tests for it!
module.exports.ClassicalService = ClassicalService;

// Now, the default export must satisfy the Awilix bootstrapping pattern.
// Because this isn't our only export, we have to use exports.default.
// NOTE: When using ES6 import-export, you can simply use `export default`.
module.exports.default = function (container) {
  // So we get the container as the first argument, now
  // lets register this module's "public API".
  //
  // `register` does nothing special, it just assigns the
  // values of the given object onto the container.
  //
  // To actually "inject" the container into our function,
  // we have to bind it. We can bind multiple
  // functions with the bindAll function.
  container.register({
    // So since we're using classes, we want to
    // register an instance of our service,
    // configured with an actual implementation of functionalService.
    classicalService: new ClassicalService(container.functionalService)

    // NOTE: Instead of specifying each dependency,
    // you can simply inject the container itself into
    // the constructor. :)
  });
};