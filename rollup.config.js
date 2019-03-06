import typescript from 'rollup-plugin-typescript2'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

const comment = '/* removed in browser build */'
const ignoredWarnings = ['UNUSED_EXTERNAL_IMPORT']

const tsOpts = {
  cacheRoot: './node_modules/.rpt2',
  typescript: require('typescript'),
  tsconfig: 'tsconfig.build.json',
  tsconfigOverride: {
    compilerOptions: {
      // Don't emit declarations, that's done by the regular build.
      declaration: false,
      module: 'ESNext'
    }
  }
}

export default [
  // Build 1: ES6 modules for Node.
  {
    input: 'src/awilix.ts',
    external: ['glob', 'path', 'util', 'camel-case'],
    treeshake: { pureExternalModules: true },
    onwarn,
    output: [
      {
        file: 'lib/awilix.module.js',
        format: 'es'
      }
    ],
    plugins: [typescript(tsOpts)]
  },
  // Build 2: ES modules for browser builds.
  {
    input: 'src/awilix.ts',
    external: ['glob', 'path', 'util'],
    treeshake: { pureExternalModules: true },
    onwarn,
    output: [
      {
        name: 'Awilix',
        file: 'lib/awilix.browser.js',
        format: 'es'
      },
      {
        name: 'Awilix',
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
        "const camelCase = require('camel-case')":
          'const camelCase = null as any',
        "export * from './list-modules'": comment,
        "import * as util from 'util'": '',
        delimiters: ['', '']
      }),
      typescript(
        Object.assign({}, tsOpts, {
          tsconfigOverride: {
            compilerOptions: {
              target: 'es5',
              declaration: false,
              noUnusedLocals: false,
              module: 'ESNext'
            }
          }
        })
      ),
      resolve(),
      commonjs()
    ]
  }
]

/**
 * Ignores certain warnings.
 */
function onwarn(warning, next) {
  if (ignoredWarnings.includes(warning.code)) {
    return
  }

  next(warning)
}
