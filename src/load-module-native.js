// This is kept in a separate .js file to prevent TypeScript re-writing the import() statement to a require() statement
function importModule(path) {
  return import(path)
}

// eslint-disable-next-line no-undef
module.exports = { importModule }
