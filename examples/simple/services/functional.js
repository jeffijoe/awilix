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

// By exporting this function as-is, we can inject mocks
// as the first argument!!!!!
function getStuffAndDeleteSecret(container, someArgument) {
  // We depend on "stuffs" repository.
  const stuffs = container.stuffs;

  // We may now carry on.
  return stuffs.getStuff(someArgument).then(stuff => {
    // Modify return value. Just to prove this is testable.
    delete stuff.secret;
    return stuff;
  });
};

module.exports.getStuffAndDeleteSecret = getStuffAndDeleteSecret;

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
    // `functionalService` is what others
    // will grab from the container. So
    // to use it, they's write
    // `container.functionalService.getStuffAndDeleteSecret`,
    // which is super cool!
    functionalService: container.bindAll({
      getStuffAndDeleteSecret: getStuffAndDeleteSecret
    })
  });
};