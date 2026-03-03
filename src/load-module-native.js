// This is kept in a separate .js file to prevent TypeScript re-writing the import() statement to a require() statement
// This is the CJS version; the .mjs version is used by the ESM build.
module.exports.importModule = function importModule(path) {
  return import(path)
}
