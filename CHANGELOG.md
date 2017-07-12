# Awilix Changelog

## 2.6

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
