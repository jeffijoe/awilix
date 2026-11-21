import typescript from 'rollup-plugin-typescript2'
import typescriptCompiler from 'typescript'
import replace from '@rollup/plugin-replace'

const comment = '/* removed in browser build */'
const ignoredWarnings = ['UNUSED_EXTERNAL_IMPORT']

const tsOpts = {
  cacheRoot: './node_modules/.rpt2',
  // The build runs `tsc` before Rollup.
  check: false,
  typescript: typescriptCompiler,
  tsconfig: 'tsconfig.build.json',
  tsconfigOverride: {
    compilerOptions: {
      // Don't emit declarations, that's done by the regular build.
      declaration: false,
      module: 'ESNext',
      moduleResolution: 'bundler',
      // Rollup resolves the `.ts` imports itself.
      rewriteRelativeImportExtensions: false,
    },
  },
}

export default [
  // Build 1: ES modules for Node.
  {
    input: 'src/awilix.ts',
    external: ['fast-glob', 'path', 'url', 'util'],
    treeshake: { moduleSideEffects: 'no-external' },
    onwarn,
    output: [
      {
        file: 'lib/awilix.module.mjs',
        format: 'es',
      },
    ],
    plugins: [typescript(tsOpts)],
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
        file: 'lib/awilix.browser.mjs',
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
      // which also means node-only stuff like `path`, `util` and `fast-glob`
      // will be shaken off.
      replace({
        delimiters: ['', ''],
        preventAssignment: true,
        'loadModules,':
          'loadModules: () => { throw new Error("loadModules is not supported in the browser.") },',
        '[util.inspect.custom]: inspect,': comment,
        '[util.inspect.custom]: toStringRepresentationFn,': comment,
        'case util.inspect.custom:': '',
        [`export {
  type GlobWithOptions,
  type ListModulesOptions,
  type ModuleDescriptor,
  listModules,
} from './list-modules.ts'`]: comment,
        "import * as util from 'util'": '',
      }),
      typescript(
        Object.assign({}, tsOpts, {
          tsconfigOverride: {
            compilerOptions: {
              ...tsOpts.tsconfigOverride.compilerOptions,
              target: 'ES2020',
              noUnusedLocals: false,
            },
          },
        }),
      ),
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
