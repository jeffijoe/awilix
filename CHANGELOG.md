# v7.0.1

* [#288](https://github.com/jeffijoe/awilix/issues/288) Don't use `Error.captureStackTrace` on unsupported platforms

# v7.0.0

* **BREAKING**: [#286](https://github.com/jeffijoe/awilix/issues/286) Support `Symbol.toStringTag`. This should fix [es5-shim/480](https://github.com/es-shims/es5-shim/issues/480).
* Update packages

### BREAKING CHANGES 

#### Cradle JSON and `inspect` representation changed

 The Awilix Cradle's string representation when used by `util.inspect`, `.toJSON()` and others returned `[AwilixContainer.cradle]`. This has been
 changed to `[object AwilixContainerCradle]` to align with other common string representations in JavaScript.

#### `Symbol.toStringTag` now implemented

When using `Object.prototype.toString.call(container.cradle)`, it would return `[object Object]`. With this change, it now returns `[object AwilixContainerCradle]`.

# v6.1.0

* [#284](https://github.com/jeffijoe/awilix/pull/284) Use `fast-glob` instead of `glob` ([Sebastian Plaza](https://github.com/sebaplaza))
* Update packages

# v6.0.0

Please see the list of breaking changes below.

- Update packages
- **BREAKING**: [#198](https://github.com/jeffijoe/awilix/issues/198) Don't parse parameters from base class
- [#270](https://github.com/jeffijoe/awilix/issues/270) Fix exponential performance slowdown for large containers
  - This was done by not relying on `rollUpRegistrations` in the `resolve` path. As a trade-off, performance
    for iterating the `cradle` proxy has degraded in order to guarantee accuracy. We consider this acceptable as iterating
    the `cradle` is not something one should be doing for anything besides debugging. Thanks to [@code-ape](https://github.com/code-ape)
    for the diagnosis and for coming up with a fix!

### BREAKING CHANGES 

* The `container.registrations` getter on a scoped container no longer rolls up registrations from its' parent.
* In `CLASSIC` mode, when parsing the constructor of a derived class, Awilix will no longer parse the base class' constructor in
  case the derived class' defined constructor does not define any arguments. However, if the derived class does _not_ define a constructor,
  then Awilix will parse the base class' constructor. Please keep in mind that this only works for native classes, as Awilix works on the
  `toString` representation of the class/function in order to determine when a class with no defined constructor is encountered.
* Renamed `container.has` to `container.hasRegistration` to avoid ambiguity. _Does it have a registration? Does it have a cached module? Who knows? Let's gooo!_

# v5.0.1

- Improve internal `uniq` function performance by using a `Set` ([#253](https://github.com/jeffijoe/awilix/pull/253), [Anderson Leite](https://github.com/andersonleite))
- Update packages

# v5.0.0

- Improve resolve typing ([#247](https://github.com/jeffijoe/awilix/pull/247), [Goran Mržljak](https://github.com/mrzli))
- Update packages

### BREAKING CHANGES 

Dropped Node 10 support. Minimum supported Node version is now 12.

# v4.3.4

- Move rollup-plugin-copy to devDependencies ([#236](https://github.com/jeffijoe/awilix/pull/236), [Evan Sosenko](https://github.com/razor-x))

# v4.3.3

- Update packages

# v4.3.2

- Convert paths to file URLs in `loadModules` with ESM, fixes [#225](https://github.com/jeffijoe/awilix/issues/225). ([#227](https://github.com/jeffijoe/awilix/pull/227), [Jamie Corkhill](https://github.com/JamieCorkhill))

# v4.3.1

- `GlobWithOptions` now includes `BuildResolverOptions` instead of `ResolverOptions` (fixes [#214](https://github.com/jeffijoe/awilix/issues/214))

# v4.3.0

- Add support for [Native Node ES modules](https://nodejs.org/api/esm.html) on Node v14+ ([#211](https://github.com/jeffijoe/awilix/pull/211), [Richard Simko](https://github.com/richardsimko))

# v4.2.7

- Fixes AwilixResolutionError throwing TypeError if resolution stack contains symbols ([#205](https://github.com/jeffijoe/awilix/pull/205), [astephens25](https://github.com/astephens25))
- Update packages

# v4.2.6

- Fix return type for `createScope` when using a cradle typing. ([#182](https://github.com/jeffijoe/awilix/pull/182), [moltar](https://github.com/moltar))
- Remove `yarn.lock`, contributing docs now recommend `npm`.
- Update packages, upgrade to Prettier 2.0

# v4.2.5

- Add optional generic parameter to container typing. Allows for a typed `ICradle`. ([#169](https://github.com/jeffijoe/awilix/pull/169), [roikoren755](https://github.com/roikoren755))

# v4.2.4

- Fix issue with parsing comments ([#165](https://github.com/jeffijoe/awilix/pull/165), reported by [Jamie Corkhill](https://github.com/JamieCorkhill))

# v4.2.3

- Fix issue where calling `JSON.stringify` on the cradle would result in memory leak ([#153](https://github.com/jeffijoe/awilix/pull/153), [berndartmueller](https://github.com/berndartmueller))
- Update packages

# v4.2.2

- Fix issue where the tokenizer was being too eager. ([#30](https://github.com/jeffijoe/awilix/issues/130))
- Make tests pass on Node v12
- Update packages

# v4.2.1

- Fix `register` option in `loadModules` ([#124](https://github.com/jeffijoe/awilix/issues/124))
- Update packages

# v4.2.0

- Add `has` method to container to check for an existing registration ([#119](https://github.com/jeffijoe/awilix/pull/119), [faustbrian](https://github.com/faustbrian))

# v4.1.0

- Extract dependencies from base class when no parameters were extracted. This works for ES6 classes as well as the old-school prototype approach to inheritance. Uses `Object.getPrototypeOf`. ([#107](https://github.com/jeffijoe/awilix/issues/107))
- Allow auto-loading of named exports that expose a `RESOLVER` symbol prop. ([#115](https://github.com/jeffijoe/awilix/pull/115))

# v4.0.1

- Support returning the `cradle` in `async` functions ([#109](https://github.com/jeffijoe/awilix/issues/109), [andyfleming](https://github.com/andyfleming)))
- Update packages

# v4.0.0

- **[BREAKING CHANGE]**: Scoped containers no longer use the parent's cache for `Lifetime.SCOPED` registrations [(#92)](https://github.com/jeffijoe/awilix/issues/92)
- Change the `"react-native"` module path to use `awilix.browser.js` [(#104)](https://github.com/jeffijoe/awilix/issues/104)
- Update packages

Awilix v4 corrects a misunderstanding in how the scoped caching should work. For full context, please see [issue #92](https://github.com/jeffijoe/awilix/issues/92), but the TL:DR version is that prior `v4`, scoped registrations (`Lifetime.SCOPED` / `.scoped()`) would travel up the family tree and use a parent's cached resolution if there is any. If there is not, the resolving scope would cache it locally.

While this was by design, it was not very useful, and it was designed based on a misunderstanding of how [Unity's `HierarchicalLifetimeManager` works](https://github.com/unitycontainer/unity/wiki/Unity-Lifetime-Managers#hierarchicallifetimemanager). In `v4`, `Lifetime.SCOPED` now works the same way: _the container performing the resolution also caches it, not looking outside itself for cached resolutions of `Lifetime.SCOPED` registrations_.

A prime use case for this is having a scoped logger, as well as a root logger. This is actually what prompted this change.

```js
// logger.js
export class Logger {
  constructor(loggerPrefix = 'root') {
    this.prefix = loggerPrefix
  }

  log(message) {
    console.log(`[${this.prefix}]: ${message}`)
  }
}
```

```js
// app.js
import { Logger } from './logger'
import { createContainer, asClass, InjectionMode } from 'awilix'

const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
}).register({
  logger: asClass(Logger).scoped(),
})

const scope = container.createScope()
scope.register({
  loggerPrefix: asValue('dope scope'),
})

const rootLogger = container.resolve('logger')
const scopeLogger = scope.resolve('logger')

rootLogger.log('yo!') // [root]: yo!
scopeLogger.log('wassup!') // [dope scope]: wassup!
```

Prior to `v4`, the `scopeLogger` would have resolved to the same as `rootLogger` because it would ask it's ancestors if they had a `logger` cached.
Now it works as you would probably expect it to: it keeps it's own cache.

# v3.0.9

- Updated packages.

# v3.0.8

- Add support for parsing async and generator functions; these no longer break the parser. ([#90](https://github.com/jeffijoe/awilix/issues/90))
- Update dependencies.

# v3.0.7

- Skip code comments in parser ([#87](https://github.com/jeffijoe/awilix/issues/87))
- Make the parser smarter by including full member expression paths so we get less false positives
  when scanning for the constructor token.

# v3.0.6

- Update `container.cradle` typing to be `any` ([#83](https://github.com/jeffijoe/awilix/issues/83), [Ackos95](https://github.com/Ackos95))

# v3.0.5

- Updated dependencies
- Fix TS 2.7 compilation issue
- Fix the `GlobWithOptions` type to include `LifetimeType`

# v3.0.4

- Fix [#76](https://github.com/jeffijoe/awilix/issues/76): don't overwrite declarations when building with Rollup.

# v3.0.3

- Adjust Rollup config to use latest [config format](https://gist.github.com/Rich-Harris/d472c50732dab03efeb37472b08a3f32)

# v3.0.2

- Updated packages, fix an internal typing issue as a result of updated typings.

# v3.0.1

- Use `Reflect.construct()` instead of `new` internally; fixes TS transpilation issue.
- Add note on browser support to README.

# v3.0.0

A lot of cool stuff has made it into version 3, and a few things were broken in
the process. I have done my best to list everything here.

## ✨ New Features

With v3 comes a few new cool features.

### Disposer support ([#48](https://github.com/jeffijoe/awilix/issues/48))

This has been a very requested feature. The idea is you can tell Awilix how to
dispose of a dependency—for example, to close a database connection—when calling
`container.dispose()`.

```js
const pg = require('pg')
const { createContainer, asFunction } = require('awilix')
const container = createContainer()
  .register({
    pool: (
      asFunction(() => new pg.Pool({ ... }))
        .singleton()
        .disposer((pool) => pool.end())
    )
  })

// .. later, but only if a `pool` was ever created
container.dispose().then(() => {
  console.log('One disposable connection.. disposed! Huehehehe')
})
```

### `alias` resolver ([#55](https://github.com/jeffijoe/awilix/issues/55))

This new resolver lets you alias a registration. This is best illustrated with
an example:

```js
const { alias, asValue, createContainer } = require('awilix')

const container = createContainer()

container.register({
  laughingOutLoud: asValue('hahahahaha'),
  lol: alias('laughingOutLoud'),
})

container.resolve('lol') // 'hahahahaha'
```

It's essentially the exact same as calling
`container.resolve('laughingOutLoad')`, but `lol` might be easier to type out in
your constructors. 😎

### Default values in constructors/functions ([#46](https://github.com/jeffijoe/awilix/issues/46))

This is a pretty _small_ feature but was the most difficult to land, mainly
because I had to write a smarter
[parser](https://github.com/jeffijoe/awilix/tree/master/src/param-parser.ts) and
[tokenizer](https://github.com/jeffijoe/awilix/tree/master/src/function-tokenizer.ts),
not to mention they are now way better at skipping over code. Check out
[the tests](https://github.com/jeffijoe/awilix/tree/master/src/__tests__/param-parser.test.ts#L149),
it's pretty wild.

```js
class MyClass {
  constructor(db, timeout = 1000) { /*...*/ }
}

container.register({
  db: asFunction(..)
})

// Look! No errors!! :D
container.build(MyClass) instanceof MyClass // true
```

### Official support for running in the browser ([#69](https://github.com/jeffijoe/awilix/issues/69))

Awilix now ships with 4 module flavors: CommonJS (same old), ES Modules for
Node, ES Modules for the Browser and UMD.

Please see the
[Universal Module](https://github.com/jeffijoe/awilix#universal-module-browser-support)
section in the readme for details.

## 🚨 Known breaking changes

The following is a list of known breaking changes. If there's any I've missed
feel free to let me know.

### The entire library is now written in TypeScript! ([#49](https://github.com/jeffijoe/awilix/issues/49))

This means a bunch of interfaces have been renamed and made more correct. If
you're a TypeScript user, this is great news for you. 😄

### `ResolutionMode` is now `InjectionMode` ([#57](https://github.com/jeffijoe/awilix/issues/57))

- `ResolutionMode.js` renamed to `injection-mode.ts`
- `ResolutionMode` renamed to `InjectionMode`

### "Registrations" are now "Resolvers" ([#51](https://github.com/jeffijoe/awilix/issues/51))

The terminology is now "you _register_ a **resolver** to a **name**".

- TypeScript interfaces renamed
- `REGISTRATION` symbol renamed to `RESOLVER`
- `registrations.js` renamed to `resolvers.ts`
- `registrationOptions` in `loadModules` renamed to `resolverOptions`

### `registerClass`, `registerFunction` and `registerValue` removed ([#60](https://github.com/jeffijoe/awilix/issues/60))

This was done to simplify the API surface, and also simplifies the
implementation greatly (less overloads). You should be using
`container.register` with `asClass`, `asFunction` and `asValue` instead.

### Resolver configuration chaining API is now immutable ([#62](https://github.com/jeffijoe/awilix/issues/62))

This simplifies the TypeScript types and is also considered a good practice. All
configuration functions rely on `this`, meaning you **should not do**:

```js
// I don't know why you would, but DONT DO THIS!
const singleton = asClass(MyClass).singleton
singleton()
```

However, this also means you can now "split" a resolver to configure it
differently. For example:

```js
class GenericSender {
  constructor(transport) {
    this.transport = transport
  }

  send() {
    if (this.transport === 'email') {
      // ... etc
    }
  }

  dispose() { /*...*/ }
}

const base = asClass(GenericSender).scoped().disposer((g) => g.dispose())
const emailSender = base.inject(() => ({ transport: 'email' })
const pushSender = base.inject(() => ({ transport: 'push' })

container.register({
  emailSender,
  pushSender
})
```

### Removed `AwilixNotAFunctionError` in favor of a generic `AwilixTypeError` ([#52](https://github.com/jeffijoe/awilix/issues/52))

This _should_ not have an impact on userland code but I thought I'd mention it.

There are a bunch of internal uses of this error, so I thought it made sense to
consolidate them into one error type.

## 👀 Other cool changes

- Code is now formatted with Prettier
- Awilix is now using `husky` + `lint-staged` to lint, format and test every
  commit to ensure top code quality.
- Switched to Jest from Mocha
- Switched from eslint to tslint
- Rewrote the function parameter parser, it is now much better at correctly
  skipping over default value expressions to reach the next parameter.
- Most (if not all) of the code is now documented and should be readable.

---

# 2.12.0

- Deprecated the `registerFunction`, `registerValue` and `registerClass`
  shortcuts.

# 2.11.1

- Fix typings for `container.build`

# 2.11.0

- Add support for `container.build()` - see
  [relevant docs](https://github.com/jeffijoe/awilix#containerbuild)

# 2.10.0

- Add support for `Object.keys()` on the cradle; now returns the names of
  available modules that can be resolved by accessing them.
  - There's a gotcha though; `Object.getOwnPropertyDescriptor()` will return a
    gibberish descriptor. This is required for the keys to show up in the
    result.
- Fix iterating over cradle - generator now yields registration names, thanks
  [@neerfri](https://github.com/neerfri)!
  ([#40](https://github.com/jeffijoe/awilix/issues/40))

# 2.9.0

- Fix issue with `console.log` on the cradle throwing an error.
  ([#7](https://github.com/jeffijoe/awilix/issues/7))
  - This _should_ not break anything, but just to be safe I did a minor version
    bump.
- Add support for `Symbol`s (although not recommended).

# 2.8.4

- Change `RegistrationOptions` typing to union of string and options

# 2.8.3

- Fix typing for `REGISTRATION` symbol

# 2.8.2

- Fix typing for `loadModules` — it didn't allow the shortcut version of
  `['glob.js', Lifetime.SCOPED]`
- Add Prettier formatting as well as `lint-staged` to keep the tests passing and
  the code fresh before committing.

# 2.8.1

- Remove `is-plain-object` and `is-string`, use simple checks instead. Trying to
  keep the dependencies as thin as possible.

# 2.8.0

- **[NEW]**: Support inline registration options
  ([#34](https://github.com/jeffijoe/awilix/issues/34))

# 2.7.1

- **[FIXED]**: `container.loadModules()` typing fix, thanks
  [@dboune](https://github.com/dboune)!

# 2.7.0

- **[BREAKING]**: Custom `isClass` function that will treat
  `function Capital () {}` as a class due to the capital first letter of the
  function name. This is to improve compatibility with Babel's ES5 code
  generator, and is also a pretty commonly accepted standard naming convention.
  ([#28](https://github.com/jeffijoe/awilix/issues/28))
- **[NEW]**: Added support for passing in a `register` function to
  `loadModules`. ([#28](https://github.com/jeffijoe/awilix/issues/28))

# 2.6.2

- **[FIXED]**: Parsing regression in 2.6.1
  ([#30](https://github.com/jeffijoe/awilix/issues/30))

# 2.6.1

- **[FIXED]**: Implemented a crude arguments parser to replace regex.
  ([#30](https://github.com/jeffijoe/awilix/issues/30))

# 2.6.0

- **[NEW]**: infer function name for `registerClass`/`registerFunction`
  ([#26](https://github.com/jeffijoe/awilix/issues/26))
- **[FIXED]**: Corrected some TypeScript typings related to `registerClass` and
  `registerFunction`.

# 2.5.0

- **[NEW]**: Implemented per-module locals injection
  ([#24](https://github.com/jeffijoe/awilix/issues/24)).
- Fixed issue where passing a `Lifetime` like
  `.registerFunction('name', func, Lifetime.SCOPED)` didn't work.
- Documented `asClass`, `asValue` and `asFunction`.
- **[FIXED]**: nasty options leaking when using
  `registerClass/Function({ test1: [Test1, { }], test2: [Test2, { }] })`.

# 2.4.0

- **[BREAKING]**: Guard assertions added to `asFunction` and `asClass`. This
  will prevent some nasty runtime behaviors.
  ([#20](https://github.com/jeffijoe/awilix/issues/20)), thanks
  [@zer0tonin](https://github.com/zer0tonin)!

# 2.3.0

- **[NEW]**: Classic dependency resolution mode using parameter name matching
  implemented, thanks to
  [@cjhoward92](https://github.com/jeffijoe/awilix/pull/21)! This is an
  alternative to the default proxy mechanism.
- **[BREAKING]**: The `registerX({ name: [value, options]})` pattern is not
  needed for `registerValue` because it is so simple is requires no
  configuration. It was causing trouble when attempting to register an array as
  a value, because the `register` function would think it was the
  value-options-array pattern when it shouldn't be. **This change is breaking in
  the sense that it solves the unexpected behavior, but it breaks existing
  registrations that would register arrays by using
  `registerValue({ name: [[1, 2]] })` (multi-dimensional array to work around
  the pre-2.3.0 behavior)**
- [chore]: Updated packages.

# 2.2.6

- Pass in the module descriptor to `formatName` - thanks @anasinnyk!
- Fixed some issues with TypeScript definitions.

# 2.2.5

- Fixed `registerFunction` return type definition - thanks @ycros!

# 2.2.4

- TypeScript definitions - thanks @blove!

# 2.2.3

- Webpack 2 compatibility - thanks @ewrogers!

# 2.2.2

- `console.log`ing the container will, instead of throwing an error, display a
  string summary of the container. Fixes #7.
- started logging changes to a changelog (sorry about being so late to the
  party)
