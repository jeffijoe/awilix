'use strict';
// Import Awilix
const awilix = require('awilix');

// Create a container.
const container = awilix.createContainer();

// Auto-load our services and our repositories.
container.loadModules([
  // Glob patterns
  'services/*.js',
  'repositories/*.js'
]).then(result => {
  console.log('Registered modules:', container.registeredModules);

  // Let's do something!
  return container.classicalService.actAllCool().then(r => {
    console.log('Result from classical service:', r);
  });
}).catch(err => {
  console.error('Error', err.stack);
});