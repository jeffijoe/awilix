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
function getStuffAndDeleteSecret(opts, someArgument) {
  // We depend on "stuffs" repository.
  const stuffs = opts.stuffs

  // We may now carry on.
  return stuffs.getStuff(someArgument).then(stuff => {
    // Modify return value. Just to prove this is testable.
    delete stuff.secret
    return stuff
  })
}

// NOTE: When using ES6 import-export, you can simply use `export default`.
module.exports = function(opts) {
  // "opts" is the container "cradle", whenever a property getter is invoked, it will
  // result in a resolution.
  return {
    getStuffAndDeleteSecret: getStuffAndDeleteSecret.bind(null, {
      stuffs: opts.stuffs
    })
  }
}

module.exports.getStuffAndDeleteSecret = getStuffAndDeleteSecret
