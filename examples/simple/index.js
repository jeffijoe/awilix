// Import Awilix
const awilix = require('../..');

// Create a container.
const container = awilix.createContainer();

// Register some value.. We depend on this in `Stuffs.js`
container.registerValue('database', 'stuffs_db');

// Auto-load our services and our repositories.
const opts = {
  // We want ClassicalService to be registered as classicalService.
  formatName: 'camelCase'
};
container.loadModules([
  // Glob patterns
  'services/*.js',
  'repositories/*.js'
], opts);

// 2 ways to resolve the same service.
const classicalServiceFromCradle = container.cradle.classicalService;
const classicalService = container.resolve('classicalService');

console.log('Resolved to the same instance:', classicalService === classicalServiceFromCradle);

// Let's do something!
return classicalService.actAllCool().then(r => {
  console.log('Result from classical service:', r);
});