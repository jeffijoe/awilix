import typescript from 'rollup-plugin-typescript2'
import typescriptCompiler from 'typescript'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import copy from 'rollup-plugin-copy'

const comment = '/* removed in browser build */'
const ignoredWarnings = ['UNUSED_EXTERNAL_IMPORT']

const tsOpts = {
  cacheRoot: './node_modules/.rpt2',
  typescript: typescriptCompiler,
  tsconfig: 'tsconfig.build.json',
  tsconfigOverride: {
    compilerOptions: {
      // Don't emit declarations, that's done by the regular build.
      declaration: false,
      module: 'ESNext',
    },
  },
}

export default [
  // Build 1: ES modules for Node.
  {
    input: 'src/awilix.ts',
    external: [
      'fast-glob',
      'path',
      'url',
      'util',
      'camel-case',
      './load-module-native.js',
    ],
    treeshake: { moduleSideEffects: 'no-external' },
    onwarn,
    output: [
      {
        file: 'lib/awilix.module.mjs',
        format: 'es',
      },
    ],
    plugins: [
      // Copy the native module loader
      copy({
        targets: [{ src: 'src/load-module-native.js', dest: 'lib' }],
      }),
      typescript(tsOpts),
    ],
  },
  // Build 2: ES modules for browser builds.
  {
    input: 'src/awilix.ts',
    external: ['fast-glob', 'path', 'url', 'util'],
    treeshake: { moduleSideEffects: 'no-external' },
    onwarn,
    output: [
      {
        name: 'Awilix',
        file: 'lib/awilix.browser.js',
        format: 'es',
      },
      {
        name: 'Awilix',
        file: 'lib/awilix.umd.js',
        format: 'umd',
      },
    ],
    plugins: [
      // Removes stuff that won't work in the browser
      // which also means node-only stuff like `path`, `util` and `glob`
      // will be shaken off.
      replace({
        'loadModules,':
          'loadModules: () => { throw new Error("loadModules is not supported in the browser.") },',
        '[util.inspect.custom]: inspect,': comment,
        '[util.inspect.custom]: toStringRepresentationFn,': comment,
        'case util.inspect.custom:': '',
        "import { camelCase } from 'camel-case'":
          'const camelCase = null as any',
        [`export {
  type GlobWithOptions,
  type ListModulesOptions,
  type ModuleDescriptor,
  listModules,
} from './list-modules'`]: comment,
        "import * as util from 'util'": '',
        delimiters: ['', ''],
      }),
      typescript(
        Object.assign({}, tsOpts, {
          tsconfigOverride: {
            compilerOptions: {
              target: 'ES2020',
              declaration: false,
              noUnusedLocals: false,
              module: 'ESNext',
            },
          },
        }),
      ),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
    ],
  },
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
