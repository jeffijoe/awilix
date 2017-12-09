import typescript from 'rollup-plugin-typescript2'
import replace from 'rollup-plugin-replace'

const comment = '/* removed in browser build */'
const ignoredWarnings = ['UNUSED_EXTERNAL_IMPORT']

export default {
  name: 'Awilix',
  input: 'src/awilix.ts',
  external: ['glob', 'path', 'util'],
  treeshake: { pureExternalModules: true },
  onwarn,
  output: [
    {
      file: 'lib/awilix.browser.js',
      format: 'es'
    },
    {
      file: 'lib/awilix.umd.js',
      format: 'umd'
    }
  ],
  plugins: [
    // Removes stuff that won't work in the browser
    // which also means node-only stuff like `path`, `util` and `glob`
    // will be shaken off.
    replace({
      'loadModules,':
        'loadModules: () => { throw new Error("loadModules is not supported in the browser.") },',
      '[util.inspect.custom]: inspect,': comment,
      'name === util.inspect.custom || ': '',
      "export * from './list-modules'": comment,
      delimiters: ['', '']
    }),
    typescript({ check: false, cacheRoot: './node_modules/.rpt2' })
  ]
}

function onwarn(warning, next) {
  if (ignoredWarnings.includes(warning.code)) {
    return
  }

  next(warning)
}
