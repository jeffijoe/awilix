# npm module boilerplate

[![npm version](https://badge.fury.io/js/npm-module-boilerplate.svg)](https://badge.fury.io/js/npm-module-boilerplate)
[![Dependency Status](https://david-dm.org/jeffijoe/npm-module-boilerplate.svg)](https://david-dm.org/jeffijoe/npm-module-boilerplate)
[![Build Status](https://travis-ci.org/jeffijoe/npm-module-boilerplate.svg?branch=master)](https://travis-ci.org/jeffijoe/npm-module-boilerplate)

A boilerplate for authoring npm modules, with tests and linting.

## What's in the package?

Well, let me tell you!

* `mocha`, `sinon` and `chai` for tests
* `eslint-watch` for linting
    * includes a set of `.eslintrc` files, one for the entire thing and one for tests only (making it `chai-should`-friendly)
* `npm run` scripts for the above, so you won't have to install any global packages while authoring your module (I hate global modules, *grr*)
* `.travis.yml` for CI

## `npm run` scripts

* `npm run test`: Runs tests once
* `npm run test-watch`: Runs tests in watch-mode
* `npm run lint`: Lints the code once
* `npm run lint-watch`: Lints the code in watch-mode

## Getting started

1. Clone this repo, or download it as a zip
    * If you decide to clone, remove the `.git` folder so you don't get unnecessary git history.
2. Find and replace all occurences of `npm-module-boilerplate` and replace
   it with your module name.
3. Edit `package.json`, `LICENSE.md` and `README.md` for your own needs.
4. `npm install` and start coding! open 2 terminals, one for linting (`npm run lint-watch`) and one for testing (`npm run test-watch`) - at least that's what I do. ;)
5. Write your code in `lib/npm-module-boilerplate.js` (this is the main file)
6. Write your tests in `test/lib/npm-module-boilerplate.spec.js` (.. or, don't?)
7. Profit!

# Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)