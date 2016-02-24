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
  console.log('Loaded modules:', result.loadedModules);
  console.log('Container:', container);

  // Let's do something!
  return container.classicalService.actAllCool().then(r => {
    console.log('Result from classical service:', r);
  });
}).catch(err => {
  console.error('Error', err.stack);
});