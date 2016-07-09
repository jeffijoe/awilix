> Hi! This is the `next` branch where I am working on the future of Awilix. The API will be different but for the better. **Spoiler**: Proxies will make IoC even greater!

# Awilix

[![npm version](https://badge.fury.io/js/awilix.svg)](https://badge.fury.io/js/awilix)
[![Dependency Status](https://david-dm.org/jeffijoe/awilix.svg)](https://david-dm.org/jeffijoe/awilix)
[![devDependency Status](https://david-dm.org/jeffijoe/awilix/dev-status.svg)](https://david-dm.org/jeffijoe/awilix#info=devDependencies)
[![Build Status](https://travis-ci.org/jeffijoe/awilix.svg?branch=next)](https://travis-ci.org/jeffijoe/awilix)
[![Coverage Status](https://coveralls.io/repos/github/jeffijoe/awilix/badge.svg?branch=next)](https://coveralls.io/github/jeffijoe/awilix?branch=next)
[![Code Climate](https://codeclimate.com/github/jeffijoe/awilix/badges/gpa.svg)](https://codeclimate.com/github/jeffijoe/awilix)

Simple **Inversion of Control** (IoC) container for Node with dependency resolution support powered by ES6 Proxies. Make IoC great again!

# Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Lifetime management](#lifetime-management)
* [Auto-loading modules](#auto-loading-modules)
* [API](#api)
  - [The `awilix` object](#the-awilix-object)
  - [`createContainer()`](#createcontainer)
  - [`listModules()`](#listmodules)
  - [`AwilixResolutionError`](#awilixresolutionerror)
  - [The `AwilixContainer` object](#the-awilixcontainer-object)
    + [`container.cradle`](#containercradle)
    + [`container.registrations`](#containerregistrations)
    + [`container.registerValue()`](#containerregistervalue)
    + [`container.registerFunction()`](#containerregisterfunction)
    + [`container.registerClass()`](#containerregisterclass)
    + [`container.loadModules()`](#containerloadmodules)
    + [`container.createScope()`](#containercreatescope)
* [Contributing](#contributing)
* [What's in a name?](#whats-in-a-name)
* [Author](#author)

# Installation

```
npm install awilix --save
```

*Requires Node v6 or above*

# Usage

Awilix has a pretty simple API. At minimum, you need to do 3 things:

* Create a container
* Register some modules in it
* Resolve and use!

`index.js`

```javascript
const awilix = require('awilix');

// Create the container.
const container = awilix.createContainer();

// This is our app code... We can use
// factory functions, constructor functions
// and classes freely.
class UserController {
  // We are using constructor injection.
  constructor(opts) {
    // Save a reference to our dependency.
    this.userService = opts.userService;
  }

  // imagine ctx is our HTTP request context...
  getUser(ctx) {
    return this.userService.getUser(ctx.params.id);
  }
}

container.registerClass({
  // Here we are telling Awilix how to resolve a
  // userController: by instantiating a class.
  userController: UserController
});

// Let's try with a factory function.
const makeUserService = ({ db }) => {
  // Notice how we can use destructuring
  // to access dependencies
  return {
    getUser: (id) => {
      return db.query(`select * from users where id=${id}`);
    }
  };
};

container.registerFunction({
  // the `userService` is resolved by
  // invoking the function.
  userService: makeUserService
});

// Alright, now we need a database.
// Let's make that a constructor function.
function Database({ connectionString }) {
  // We can inject plain values as well!
  this.conn = connectToYourDatabaseSomehow(connectionString);
}

Database.prototype.query = function(sql) {
  // blah....
  return this.conn.rawSql(sql);
}

// We use registerClass because we want it to be called with `new`.
container.registerClass({
  db: Database
})

// Lastly we register the connection string,
// as we need it in the Database constructor.
container.registerValue({
  // We can register things as-is - this is not just
  // limited to strings and numbers, it can be anything,
  // really - they will be passed through directly.
  connectionString: process.env.CONN_STR
});


// We have now wired everything up!
// Let's use it! (use your imagination with the router thing..)
router.get('/api/users/:id', container.resolve('userController').getUser);

// Alternatively..
router.get('/api/users/:id', container.cradle.userController.getUser);

// Using  `container.cradle.userController` is actually the same as calling
// `container.resolve('userController')` - the cradle is our proxy!
```

That example looks big, but if you extract things to their proper files, it becomes rather elegant!

# Lifetime management

Awilix supports managing the lifetime of registrations. This means that you can control whether objects are resolved and used once, or cached for the lifetime of the process.

There are 3 lifetime types available.

* `TRANSIENT`: This is the default. The registration is resolved every time it is needed. This means if you resolve a class more than once, you will get back a new instance every time.
* `SCOPED`: The registration is scoped to the container - that means that the resolved value will be reused when resolved from the same scope.
* `SINGLETON`: The registration is always reused no matter what.

They are exposed on the `awilix.Lifetime` object.

```js
const Lifetime = awilix.Lifetime;
```

To register a module with a specific lifetime:

```js
class MailService {}

container.registerClass({
  mailService: [MailService, { lifetime: Lifetime.SINGLETON }]
});

// or using the registration functions directly..
const { asClass, asFunction, asValue } = awilix;
container.register({
  mailService: asClass(MailService).lifetime(Lifetime.SINGLETON)
});

// or..
container.register({
  mailService: asClass(MailService).singleton()
});

// all roads lead to rome
container.register({
  mailService: asClass(MailService, { lifetime: Lifetime.SINGLETON })
});
// seriously..
container.registerClass('mailService', MailService, { lifetime: SINGLETON });
```

## Scoped lifetime

In web applications, managing state without depending too much on the web framework can get difficult. Having to pass tons of information into every function just to make the right choices based on the authenticated user.

Scoped lifetime in Awilix makes this simple - and fun!

```js
const { createContainer, asClass, asValue } = awilix;
const container = createContainer();

class MessageService {
  constructor({ currentUser }) {
    this.user = currentUser;
  }

  getMessages() {
    const id = this.user.id;
    // wee!
  }
}

container.register({
  messageService: asClass(MessageService).scoped()
});

// imagine middleware in some web framework..
app.use((req, res, next) => {
  // create a scoped container
  req.scope = container.createScope();

  // register some request-specific data..
  req.scope.register({
    currentUser: asValue(req.user)
  });

  next();
});

app.get('/messages', (req,res) => {
  // for each request we get a new message service!
  const messageService = req.scope.resolve('messageService');
  messageService.getMessages().then(messages => {
    res.send(200, messages)
  });
});

// The message service can now be tested
// without depending on any request data!
```

**IMPORTANT!** If a singleton is resolved, and it depends on a scoped or transient registration, those will remain in the singleton for it's lifetime!

```js
const makePrintTime = ({ time }) => () => {
  console.log('Time:', time);
};

const getTime = () => new Date().toString();

container.register({
  printTime: asFunction(makePrintTime).singleton(),
  time: asFunction(getTime).transient()
});

// Resolving `time` 2 times will
// invoke `getTime` 2 times.
container.resolve('time')
container.resolve('time')

// These will print the same timestamp at all times,
// because `printTime` is singleton and
// `getTime` was invoked when making the singleton.
container.resolve('printTime')();
container.resolve('printTime')();
```

Read the documentation for [`container.createScope()`](#containercreatescope) for more examples.

# Auto-loading modules

When you have created your container, registering 100's of classes can get boring. You can automate this by using `loadModules`.

Imagine this app structure:

* `app`
  - `services`
    + `UserService.js` - exports an ES6 `class UserService {}`
    + `emailService.js`  - exports a factory function `function makeEmailService() {}`
  - `repositories`
    + `UserRepository.js` - exports an ES6 `class UserRepository {}`
  - `index.js` - our main script

In our main script we would do the following

```js
const awilix = require('awilix');

const container = awilix.createContainer();

// Load our modules!
container.loadModules([
  // Globs!
  'services/**/*.js',
  'repositories/**/*.js'
], {
  // We want to register `UserService` as `userService` -
  // by default loaded modules are registered with the
  // name of the file (minus the extension)
  formatName: 'camelCase',
  // We can make registrations singleton.
  registrationOptions: {
    lifetime: Lifetime.SINGLETON
  }
});

// We are now ready! We now have a userService, userRepository and emailService!
container.resolve('userService').getUser(1);
```

# API

## The `awilix` object

When importing `awilix`, you get the following top-level API:

* `createContainer`
* `listModules`
* `AwilixResolutionError`
* `asValue`
* `asFunction`
* `asClass`
* `Lifetime`

These are documented below.

## `createContainer()`

Creates a new Awilix container. The container stuff is documented further down.

Args:

* `options`: Options object. Optional.
  - `options.require`: The function to use when requiring modules. Defaults to `require`. Useful when using something like [`require-stack`](https://npmjs.org/package/require-stack). Optional.

## `listModules()`

Returns an array of `{name, path}` pairs,
where the name is the module name, and path is the actual
full path to the module.

This is used internally, but is useful for other things as well, e.g.
dynamically loading an `api` folder.

Args:

* `globPatterns`: a glob pattern string, or an array of them.
* `opts.cwd`: The current working directory passed to `glob`. Defaults to `process.cwd()`.
* **returns**: an array of objects with:
  - `name`: The module name - e.g. `db`
  - `path`: The path to the module relative to `options.cwd` - e.g. `lib/db.js`

Example:

```js
const listModules = require('awilix').listModules;

const result = listModules([
  'services/*.js'
]);

console.log(result);
  // << [{ name: 'someService', path: 'path/to/services/someService.js' }]
```

## `AwilixResolutionError`

This is a special error thrown when Awilix is unable to resolve all dependencies (due to missing or cyclic dependencies). You can catch this error and use `err instanceof AwilixResolutionError` if you wish. It will tell you what dependencies it could not find or which ones caused a cycle.

## The `AwilixContainer` object

The container returned from `createContainer` has some methods and properties.

### `container.cradle`

**Behold! This is where the magic happens!** The `cradle` is a proxy, and all getters will trigger a `container.resolve`. The `cradle` is actually being
passed to the constructor/factory function, which is how everything gets wired up.

### `container.registrations`

A read-only getter that returns the internal registrations. Not really useful for public use.

### `container.register()`

Registers modules with the container. This function is used by the `registerValue`, `registerFunction` and `registerClass` functions.

Awilix needs to know how to resolve the modules, so let's pull out the
registration functions:

```js
const awilix = require('awilix');
const { asValue, asFunction, asClass } = awilix;
```

* `asValue`: Resolves the given value as-is.
* `asFunction`: Resolve by invoking the function with the container cradle as the first and only argument.
* `asClass`: Like `asFunction` but uses `new`.

Now we need to use them. There are multiple syntaxes for the `register` function, pick the one you like the most - or use all of them, I don't really care! :sunglasses:

**Both styles supports chaining! `register` returns the container!**

```js
// name-value-options
container.register('connectionString', asValue('localhost:1433;user=...'));
container.register('mailService', asFunction(makeMailService), { lifetime: Lifetime.SINGLETON });
container.register('context', asClass(SessionContext), { lifetime: Lifetime.SCOPED });

// object
container.register({
  connectionString: asValue('localhost:1433;user=...'),
  mailService: asFunction(makeMailService, { lifetime: Lifetime.SINGLETON }),
  context: asClass(SessionContext, { lifetime: Lifetime.SCOPED })
})

// `registerFunction` and `registerClass` also supports a fluid syntax.
container.register('mailService', asFunction(makeMailService).setLifetime(Lifetime.SINGLETON))
container.register('context', asClass(SessionContext).singleton())
container.register('context', asClass(SessionContext).transient())
container.register('context', asClass(SessionContext).scoped())
```

**The object syntax, key-value syntax and chaining are valid for all `register` calls!**

### `container.registerValue()`

Registers a constant value in the container. Can be anything.

```js
container.registerValue({
  someName: 'some value',
  db: myDatabaseObject
});

// Alternative syntax:
container.registerValue('someName', 'some value');
container.registerValue('db', myDatabaseObject);

// Chaining
container
  .registerValue('someName', 'some value')
  .registerValue('db', myDatabaseObject);
```

### `container.registerFunction()`

Registers a standard function to be called whenever being resolved. The factory function can return anything it wants, and whatever it returns is what is passed to dependents.

By default all registrations are `TRANSIENT`, meaning resolutions will **not** be cached. This is configurable on a per-registration level.

**The array syntax for values means `[value, options]`.** This is also valid for `registerClass`.

```js
const myFactoryFunction = ({ someName }) => (
  `${new Date().toISOString()}: Hello, this is ${someName}`
);

container.registerFunction({ fullString: myFactoryFunction });
console.log(container.cradle.fullString);
// << 2016-06-24T16:00:00.00Z: Hello, this is some value

// Wait 2 seconds, try again
setTimeout(() => {
  console.log(container.cradle.fullString);
  // << 2016-06-24T16:00:02.00Z: Hello, this is some value

  // The timestamp is different because the
  // factory function was called again!
}, 2000);

// Let's try this again, but we want it to be
// cached!
const Lifetime = awilix.Lifetime;
container.registerFunction({
  fullString: [myFactoryFunction, { lifetime: Lifetime.SINGLETON }]
});

console.log(container.cradle.fullString);
// << 2016-06-24T16:00:02.00Z: Hello, this is some value

// Wait 2 seconds, try again
setTimeout(() => {
  console.log(container.cradle.fullString);
  // << 2016-06-24T16:00:02.00Z: Hello, this is some value

  // The timestamp is the same, because
  // the factory function's result was cached.
}, 2000);
```

### `container.registerClass()`

Same as `registerFunction`, except it will use `new`.

By default all registrations are `TRANSIENT`, meaning resolutions will **not** be cached. This is configurable on a per-registration level.

```js
class Exclaimer {
  constructor({ fullString }) {
    this.fullString = fullString;
  }

  exclaim() {
    return this.fullString + '!!!!!';
  }
}

container.registerClass({
  exclaimer: Exclaimer
});

// or..
container.registerClass({
  exclaimer: [Exclaimer, { lifetime: Lifetime.SINGLETON }]
});

container.cradle.exclaimer.exclaim();
// << 2016-06-24T17:00:00.00Z: Hello, this is some value!!!!!
```

### `container.createScope()`

Creates a new scope. All registrations with a `Lifetime.SCOPED` will be cached inside a scope. A scope is basically a "child" container.

* returns `AwilixContainer`

```js
// Increments the counter every time it is resolved.
let counter = 1;
container.register({
  counterValue: asFunction(() => counter++).scoped()
});
const scope1 = container.createScope();
const scope2 = container.createScope();

const scope1Child = scope1.createScope();

scope1.cradle.counterValue === 1
scope1.cradle.counterValue === 1
scope2.cradle.counterValue === 2
scope2.cradle.counterValue === 2

scope1Child.cradle.counterValue === 1
```

**Be careful!** If a scope's *parent* has already resolved a scoped value, that value will be returned.

```js
let counter = 1;
container.register({
  counterValue: asFunction(() => counter++).scoped()
});
const scope1 = container.createScope();
const scope2 = container.createScope();

container.cradle.counterValue === 1

// These are resolved to the parent's cached value.
scope1.cradle.counterValue === 1
scope1.cradle.counterValue === 1
scope2.cradle.counterValue === 1
scope2.cradle.counterValue === 1
```

A scope may also register additional stuff - they will only be available within that scope and it's children.

```js
// Register a transient function
// that returns the value of the scope-provided dependency.
// For this example we could also use scoped lifetime.
container.register({
  scopedValue: asFunction((cradle) => 'Hello ' + cradle.someValue)
});

// Create a scope and register a value.
const scope = container.createScope();
scope.register({
  someValue: asValue('scope')
});

scope.cradle.scopedValue === 'Hello scope';
container.cradle.someValue
// throws AwilixResolutionException
// because the root container does not know
// of the registration.
```

Things registered in the scope take precedence over it's parent.

```js
// It does not matter when the scope is created,
// it will still have anything that is registered
// in it's parent.
const scope = container.createScope();

container.register({
  value: asValue('root'),
  usedValue: asFunction((cradle) => cradle.value)
});

scope.register({
  value: asValue('scope')
});

container.cradle.usedValue === 'root'
scope.cradle.usedValue === 'scope'
```

### `container.loadModules()`

Given an array of globs, returns a `Promise` when loading is done.

Awilix will use `require` on the loaded modules, and register the default-exported function or class as the name of the file.

**This will not work for constructor functions (`function Database{} ...`), because there is no way to determine when to use `new`. Internally, Awilix uses `is-class` which only works for ES6 classes.**

Args:

* `globPatterns`: Array of glob patterns that match JS files to load.
* `opts.cwd`: The `cwd` being passed to `glob`. Defaults to `process.cwd()`.
* **returns**: A `Promise` for when we're done. This won't be resolved until all modules are ready.
* `opts.formatName`: Can be either `'camelCase'`, or a function that takes the current name as the first parameter and returns the new name. Default is to pass the name through as-is.
* `registrationOptions`: An `object` passed to the registrations. Used to configure the lifetime of the loaded modules.

Example:

```js
// index.js
container.loadModules([
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
]).then(() => {
  console.log('We are ready!');
  container.cradle.userService.getUser(123);
});

// to configure lifetime for all modules loaded..
container.loadModules([
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
], {
  registrationOptions: {
    lifetime: Lifetime.SINGLETON
  }
});

container.cradle.userService.getUser(123);
```

# Contributing

Clone repo, run `npm i` to install all dependencies, and then `npm run test-watch` + `npm run lint-watch` to start writing code.

For code coverage, run `npm run coverage`.

If you submit a PR, please aim for 100% code coverage and no linting errors.
Travis will fail if there are linting errors. Thank you for considering contributing. :)

# What's in a name?

Awilix is the mayan goddess of the moon, and also my favorite character in the game [SMITE](http://www.smitegame.com/play-for-free?ref=Jeffijoe).

# Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)
