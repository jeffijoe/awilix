# Awilix Changelog

## 2.10.0

* Add support for `Object.keys()` on the cradle; now returns the names of available modules that can be resolved by accessing them.
  - There's a gotcha though; `Object.getOwnPropertyDescriptor()` will return a gibberish descriptor. This is required for the keys to show up in the result.
* Fix iterating over cradle - generator now yields registration names, thanks [@neerfri](https://github.com/neerfri)! ([#40](https://github.com/jeffijoe/awilix/issues/40))

## 2.9.0

* Fix issue with `console.log` on the cradle throwing an error. ([#7](https://github.com/jeffijoe/awilix/issues/7))
  - This _should_ not break anything, but just to be safe I did a minor version bump.
* Add support for `Symbol`s (although not recommended).

## 2.8.4

* Change `RegistrationOptions` typing to union of string and options

## 2.8.3

* Fix typing for `REGISTRATION` symbol

## 2.8.2

* Fix typing for `loadModules` — it didn't allow the shortcut version of `['glob.js', Lifetime.SCOPED]`
* Add Prettier formatting as well as `lint-staged` to keep the tests passing and the code fresh before committing.

## 2.8.1

* Remove `is-plain-object` and `is-string`, use simple checks instead. Trying to keep the dependencies as thin as possible.

## 2.8.0

* **[NEW]**: Support inline registration options ([#34](https://github.com/jeffijoe/awilix/issues/34))

## 2.7.1

* **[FIXED]**: `container.loadModules()` typing fix, thanks [@dboune](https://github.com/dboune)!

## 2.7.0

* **[BREAKING]**: Custom `isClass` function that will treat `function Capital () {}` as a class due to the capital first letter of the function name. This is to improve compatibility with Babel's ES5 code generator, and is also a pretty commonly accepted standard naming convention. ([#28](https://github.com/jeffijoe/awilix/issues/28))
* **[NEW]**: Added support for passing in a `register` function to `loadModules`. ([#28](https://github.com/jeffijoe/awilix/issues/28))

## 2.6.2

* **[FIXED]**: Parsing regression in 2.6.1 ([#30](https://github.com/jeffijoe/awilix/issues/30))

## 2.6.1

* **[FIXED]**: Implemented a crude arguments parser to replace regex. ([#30](https://github.com/jeffijoe/awilix/issues/30))

## 2.6.0

* **[NEW]**: infer function name for `registerClass`/`registerFunction` ([#26](https://github.com/jeffijoe/awilix/issues/26))
* **[FIXED]**: Corrected some TypeScript typings related to `registerClass` and `registerFunction`.

## 2.5.0

* **[NEW]**: Implemented per-module locals injection ([#24](https://github.com/jeffijoe/awilix/issues/24)).
* Fixed issue where passing a `Lifetime` like `.registerFunction('name', func, Lifetime.SCOPED)` didn't work.
* Documented `asClass`, `asValue` and `asFunction`.
* **[FIXED]**: nasty options leaking when using `registerClass/Function({ test1: [Test1, { }], test2: [Test2, { }] })`.

## 2.4.0

* **[BREAKING]**: Guard assertions added to `asFunction` and `asClass`. This will prevent some nasty runtime behaviors. ([#20](https://github.com/jeffijoe/awilix/issues/20)), thanks [@zer0tonin](https://github.com/zer0tonin)!

## 2.3.0

* **[NEW]**: Classic dependency resolution mode using parameter name matching implemented, thanks to [@cjhoward92](https://github.com/jeffijoe/awilix/pull/21)! This is an alternative to the default proxy mechanism.
* **[BREAKING]**: The `registerX({ name: [value, options]})` pattern is not needed for `registerValue` because it is so simple is requires no configuration. It was causing trouble when attempting to register an array as a value, because the `register` function would think it was the value-options-array pattern when it shouldn't be. **This change is breaking in the sense that it solves the unexpected behavior, but it breaks existing registrations that would register arrays by using `registerValue({ name: [[1, 2]] })` (multi-dimensional array to work around the pre-2.3.0 behavior)**
* [chore]: Updated packages.

## 2.2.6

* Pass in the module descriptor to `formatName` - thanks @anasinnyk!
* Fixed some issues with TypeScript definitions.

## 2.2.5

* Fixed `registerFunction` return type definition - thanks @ycros!

## 2.2.4

* TypeScript definitions - thanks @blove!

## 2.2.3

* Webpack 2 compatibility - thanks @ewrogers!

## 2.2.2

* `console.log`ing the container will, instead of throwing an error, display a string summary of the container. Fixes #7.
* started logging changes to a changelog (sorry about being so late to the party)
