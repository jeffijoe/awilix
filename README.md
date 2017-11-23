# Awilix

[![Join the chat at https://gitter.im/awilix/Lobby](https://badges.gitter.im/awilix/Lobby.svg)](https://gitter.im/awilix/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/v/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![dependency Status](https://img.shields.io/david/jeffijoe/awilix.svg?maxAge=1000)](https://david-dm.org/jeffijoe/awilix)
[![devDependency Status](https://img.shields.io/david/dev/jeffijoe/awilix.svg?maxAge=1000)](https://david-dm.org/jeffijoe/awilix)
[![Build Status](https://img.shields.io/travis/jeffijoe/awilix.svg?maxAge=1000)](https://travis-ci.org/jeffijoe/awilix)
[![Coveralls](https://img.shields.io/coveralls/jeffijoe/awilix.svg?maxAge=1000)](https://coveralls.io/github/jeffijoe/awilix)
[![Code Climate](https://img.shields.io/codeclimate/github/jeffijoe/awilix.svg?maxAge=1000)](https://codeclimate.com/github/jeffijoe/awilix)
[![npm](https://img.shields.io/npm/dt/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![npm](https://img.shields.io/npm/l/awilix.svg?maxAge=1000)](https://github.com/jeffijoe/awilix/blob/master/LICENSE.md)
[![node](https://img.shields.io/node/v/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Extremely powerful **Inversion of Control** (IoC) container for Node with dependency resolution support powered by `Proxy`. Make IoC great again!

> Check out this [intro to Dependency Injection with Awilix](https://medium.com/@Jeffijoe/dependency-injection-in-node-js-2016-edition-f2a88efdd427)

# Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Lifetime management](#lifetime-management)
* [Injection modes](#injection-modes)
* [Auto-loading modules](#auto-loading-modules)
* [Per-module local injections](#per-module-local-injections)
* [Inlining resolver options](#inlining-resolver-options)
* [API](#api)
  - [The `awilix` object](#the-awilix-object)
  - [Resolver options](#resolver-options)
  - [`createContainer()`](#createcontainer)
  - [`asFunction()`](#asfunction)
  - [`asClass()`](#asclass)
  - [`asValue()`](#asvalue)
  - [`aliasTo()`](#aliasto)
  - [`listModules()`](#listmodules)
  - [`AwilixResolutionError`](#awilixresolutionerror)
  - [The `AwilixContainer` object](#the-awilixcontainer-object)
    + [`container.cradle`](#containercradle)
    + [`container.registrations`](#containerregistrations)
    + [`container.cache`](#containercache)
    + [`container.options`](#containeroptions)
    + [`container.resolve()`](#containerresolve)
    + [`container.register()`](#containerregister)
    + [`container.registerValue()`](#containerregistervalue)
    + [`container.registerFunction()`](#containerregisterfunction)
    + [`container.registerClass()`](#containerregisterclass)
    + [`container.loadModules()`](#containerloadmodules)
    + [`container.createScope()`](#containercreatescope)
    + [`container.build()`](#containerbuild)
* [Contributing](#contributing)
* [What's in a name?](#whats-in-a-name)
* [Author](#author)

# Installation

```
npm install awilix --save
```

*Requires Node v6 or above*

# Usage

Awilix has a pretty simple API (but with many possible ways to invoke it). At minimum, you need to do 3 things:

* Create a container
* Register some modules in it
* Resolve and use!

`index.js`

```javascript
const awilix = require('awilix')

// Create the container and set the injectionMode to PROXY (which is also the default).
const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.PROXY
})

// This is our app code... We can use
// factory functions, constructor functions
// and classes freely.
class UserController {
  // We are using constructor injection.
  constructor(opts) {
    // Save a reference to our dependency.
    this.userService = opts.userService
  }

  // imagine ctx is our HTTP request context...
  getUser(ctx) {
    return this.userService.getUser(ctx.params.id)
  }
}

container.registerClass({
  // Here we are telling Awilix how to resolve a
  // userController: by instantiating a class.
  userController: UserController
})

// Let's try with a factory function.
const makeUserService = ({ db }) => {
  // Notice how we can use destructuring
  // to access dependencies
  return {
    getUser: (id) => {
      return db.query(`select * from users where id=${id}`)
    }
  }
}

container.registerFunction({
  // the `userService` is resolved by
  // invoking the function.
  userService: makeUserService
})

// Alright, now we need a database.
// Let's make that a constructor function.
// Notice how the dependency is referenced by name 
// directly instead of destructuring an object.
// This is because we register it in "CLASSIC" 
// injection mode below.
function Database(connectionString, timeout) {
  // We can inject plain values as well!
  this.conn = connectToYourDatabaseSomehow(connectionString, timeout)
}

Database.prototype.query = function(sql) {
  // blah....
  return this.conn.rawSql(sql)
}


// We use register coupled with asClass to tell Awilix to 
// use `new Database(...)` instead of just `Database(...)`.
// We also want to use `CLASSIC` injection mode for this 
// registration. Read more about injection modes below.
container.register({
  db: awilix.asClass(Database).classic()
})

// Lastly we register the connection string and timeout values
// as we need them in the Database constructor.
container.registerValue({
  // We can register things as-is - this is not just
  // limited to strings and numbers, it can be anything,
  // really - they will be passed through directly.
  connectionString: process.env.CONN_STR,
  timeout: 1000
})

// We have now wired everything up!
// Let's use it! (use your imagination with the router thing..)
router.get('/api/users/:id', container.resolve('userController').getUser)

// Alternatively, using the `cradle` proxy..
router.get('/api/users/:id', container.cradle.userController.getUser)

// Using  `container.cradle.userController` is actually the same as calling
// `container.resolve('userController')` - the cradle is our proxy!
```

That example is rather lengthy, but if you extract things to their proper files it becomes more manageable.

[Check out a working Koa example!](/examples/koa)

# Lifetime management

Awilix supports managing the lifetime of instances. This means that you can control whether objects are resolved and used once, cached within a certain scope, or cached for the lifetime of the process.

There are 3 lifetime types available.

* `Lifetime.TRANSIENT`: This is the default. The registration is resolved every time it is needed. This means if you resolve a class more than once, you will get back a new instance every time.
* `Lifetime.SCOPED`: The registration is scoped to the container - that means that the resolved value will be reused when resolved from the same scope (or a child scope).
* `Lifetime.SINGLETON`: The registration is always reused no matter what - that means that the resolved value is cached in the root container.

They are exposed on the `awilix.Lifetime` object.

```js
const Lifetime = awilix.Lifetime
```

To register a module with a specific lifetime:

```js
class MailService {}

container.registerClass({
  mailService: [MailService, { lifetime: Lifetime.SINGLETON }]
})

// or using the resolver functions directly..
const { asClass, asFunction, asValue } = awilix
container.register({
  mailService: asClass(MailService).lifetime(Lifetime.SINGLETON)
})

// or..
container.register({
  mailService: asClass(MailService).singleton()
})

// all roads lead to rome
container.register({
  mailService: asClass(MailService, { lifetime: Lifetime.SINGLETON })
})
// seriously..
container.registerClass('mailService', MailService, { lifetime: SINGLETON })
```

## Scoped lifetime

In web applications, managing state without depending too much on the web framework can get difficult. Having to pass tons of information into every function just to make the right choices based on the authenticated user.

Scoped lifetime in Awilix makes this simple - and fun!

```js
const { createContainer, asClass, asValue } = awilix
const container = createContainer()

class MessageService {
  constructor({ currentUser }) {
    this.user = currentUser
  }

  getMessages() {
    const id = this.user.id
    // wee!
  }
}

container.register({
  messageService: asClass(MessageService).scoped()
})

// imagine middleware in some web framework..
app.use((req, res, next) => {
  // create a scoped container
  req.scope = container.createScope()

  // register some request-specific data..
  req.scope.register({
    currentUser: asValue(req.user)
  })

  next()
})

app.get('/messages', (req,res) => {
  // for each request we get a new message service!
  const messageService = req.scope.resolve('messageService')
  messageService.getMessages().then(messages => {
    res.send(200, messages)
  })
})

// The message service can now be tested
// without depending on any request data!
```

**IMPORTANT!** If a singleton is resolved, and it depends on a scoped or transient registration, those will remain in the singleton for it's lifetime!

```js
const makePrintTime = ({ time }) => () => {
  console.log('Time:', time)
}

const getTime = () => new Date().toString()

container.register({
  printTime: asFunction(makePrintTime).singleton(),
  time: asFunction(getTime).transient()
})

// Resolving `time` 2 times will
// invoke `getTime` 2 times.
container.resolve('time')
container.resolve('time')

// These will print the same timestamp at all times,
// because `printTime` is singleton and
// `getTime` was invoked when making the singleton.
container.resolve('printTime')()
container.resolve('printTime')()
```

Read the documentation for [`container.createScope()`](#containercreatescope) for more examples.

# Injection modes

The injection mode determines how a function/constructor receives its dependencies. Pre-2.3.0, only one mode was
supported - `PROXY` - which remains the default mode.

Awilix v2.3.0 introduced an alternative injection mode: `CLASSIC`. The injection modes are available on `awilix.InjectionMode`

* `InjectionMode.PROXY` (default): Injects a proxy to functions/constructors which looks like a regular object.
    
    ```js
    class UserService {
      constructor (opts) {
        this.emailService = opts.emailService
        this.logger = opts.logger
      }
    }
    ```
    
    or with destructuring:
    
    ```js
    class UserService {
      constructor ({ emailService, logger }) {
        this.emailService = emailService
        this.logger = logger
      }
    }
    ```

* `InjectionMode.CLASSIC`: Parses the function/constructor parameters, and matches them with registrations in the container.
    
    ```js
    class UserService {
      constructor (emailService, logger) {
        this.emailService = emailService
        this.logger = logger
      }
    }
    ```

Injection modes can be set per-container and per-resolver. The most specific one wins.

> Note: I personally don't see why you would want to have different injection modes in a project, but
> if the need arises, Awilix supports it.

**Container-wide**:

```js
const { createContainer, InjectionMode } = require('awilix')

const container = createContainer({ injectionMode: InjectionMode.CLASSIC })
```

**Per resolver**:

```js
const container = createContainer()

container.register({
  logger: asClass(Logger).classic(),
  // or..
  emailService: asFunction(makeEmailService).proxy()
  // or..
  notificationService: asClass(NotificationService).setInjectionMode(InjectionMode.CLASSIC)
})

// or..
container.registerClass({
  logger: [Logger, { injectionMode: InjectionMode.CLASSIC }]
})
```

**For auto-loading modules**:

```js
const container = createContainer()
container.loadModules([
  'services/**/*.js',
  'repositories/**/*.js'
], {
  resolverOptions: {
    injectionMode: InjectionMode.CLASSIC
  }
})
```

Choose whichever fits your style. 

* `PROXY` _technically_ allows you to defer pulling dependencies (for circular dependency support), but **this isn't recommended**.
* `CLASSIC` feels more like the DI you're used to in other languages.
* `PROXY` is more descriptive, and makes for more readable tests; when unit testing your classes/functions without using Awilix, you don't have to worry about parameter ordering like you would with `CLASSIC`.

Here's an example outlining the testability points raised.

```js
// CLASSIC
function database (connectionString, timeout, logger) {
  // ...
}

// Shorter, but less readable, order-sensitive
const db = database('localhost:1337;user=123...', 4000, new LoggerMock())

// PROXY
function database ({ connectionString, timeout, logger }) {
  // ...
}

// Longer, more readable, order does not matter
const db = database({
  logger: new LoggerMock(),
  timeout: 4000,
  connectionString: 'localhost:1337;user=123...'
})
```

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
const awilix = require('awilix')

const container = awilix.createContainer()

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
  // Apply resolver options to all modules.
  resolverOptions: {
    // We can give these auto-loaded modules
    // the deal of a lifetime! (see what I did there?)
    // By default it's `TRANSIENT`.
    lifetime: Lifetime.SINGLETON,
    // We can tell Awilix what to register everything as,
    // instead of guessing. If omitted, will inspect the
    // module to determinw what to register as.
    register: awilix.asClass
  }
})

// We are now ready! We now have a userService, userRepository and emailService!
container.resolve('userService').getUser(1)
```

**Important**: Auto-loading relies on `glob` and therefore does not with bundlers like Webpack, Rollup and Browserify.

# Per-module local injections

Some modules might need some additional configuration values than just dependencies.

For example, our `userRepository` wants a `db` module which is registered with the container, but it also wants a `timeout` value. `timeout` is a very generic name and we don't want to register that as a value that can be accessed by all modules in the container (maybe other modules have a different timeout?)

```js
export default function userRepository ({ db, timeout }) {
  return {
    find () {
      return Promise.race([
        db.query('select * from users'),
        Promise.delay(timeout).then(() => Promise.reject(new Error('Timed out')))
      ])
    }
  }
}
```

Awilix 2.5 added per-module local injections. The following snippet contains _all_ the possible ways to set this up.

```js
import { createContainer, Lifetime, asFunction } from 'awilix'
import createUserRepository from './repositories/userRepository'

const container = createContainer()
  // Using the fluid variant:
  .register({
    userRepository: asFunction(createUserRepository)
      // Provide an injection function that returns an object with locals.
      // The function is called once per resolve of the registration
      // it is attached to.
      .inject(() => ({ timeout: 2000 }))
  })
  
  // Shorthand variants
  .registerFunction({
    userRepository: [createUserRepository, { injector: () => ({ timeout: 2000 }) }]
  })
  
  // Stringly-typed shorthand
  .registerFunction(
    'userRepository', 
    createUserRepository, 
    { injector: () => ({ timeout: 2000 }) }
  )
  
  // with `loadModules`
  .loadModules([
    ['repositories/*.js', { injector: () => ({ timeout: 2000 }) }]
  ])
```

Now `timeout` is only available to the modules it was configured for.

**IMPORTANT**: the way this works is by wrapping the `cradle` in another proxy that provides the returned values from the `inject` function. This means if you pass along the injected cradle object, anything with access to it can access the local injections.

# Inlining resolver options

Awilix 2.8 added support for inline resolver options. This is best explained with an example.

**services/awesome-service.js**:

```js
import { RESOLVER, Lifetime, InjectionMode } from 'awilix'

export default class AwesomeService {
  constructor (awesomeRepository) {
    this.awesomeRepository = awesomeRepository
  }
}

// `RESOLVER` is a Symbol.
AwesomeService[RESOLVER] = {
  lifetime: Lifetime.SCOPED,
  injectionMode: InjectionMode.CLASSIC
}
```

**index.js**:

```js
import { createContainer } from 'awilix'
import AwesomeService from './services/awesome-service.js'

const container = createContainer()
  .registerClass({
    awesomeService: AwesomeService
  })

console.log(container.registrations.awesomeService.lifetime) // 'SCOPED'
console.log(container.registrations.awesomeService.injectionMode) // 'CLASSIC'
```

Additionally, if we add a `name` field and use `loadModules`, the `name` is used for registration.

```diff
// `RESOLVER` is a Symbol.
AwesomeService[RESOLVER] = {
+ name: 'superService',
  lifetime: Lifetime.SCOPED,
  injectionMode: InjectionMode.CLASSIC
}
```

```js
const container = createContainer()
  .loadModules(['services/*.js'])
console.log(container.registrations.superService.lifetime) // 'SCOPED'
console.log(container.registrations.superService.injectionMode) // 'CLASSIC'
```

**Important**: the `name` field is only used by `loadModules`.

# API

## The `awilix` object

When importing `awilix`, you get the following top-level API:

* `createContainer`
* `listModules`
* `AwilixResolutionError`
* `asValue`
* `asFunction`
* `asClass`
* `aliasTo`
* `Lifetime` - documented above.
* `InjectionMode` - documented above.

These are documented below.

## Resolver options

Whenever you see a place where you can pass in **resolver options**, you can pass in an object with the following props:

* `lifetime`: An `awilix.Lifetime.*` string, such as `awilix.Lifetime.SCOPED`
* `injectionMode`: An `awilix.InjectionMode.*` string, such as `awilix.InjectionMode.CLASSIC`
* `injector`: An injector function - see [Per-module local injections](#per-module-local-injections)
* `register`: Only used in `loadModules`, determines how to register a loaded module explicitly

**Examples of usage:**

```js
container.register({
  stuff: asClass(MyClass, { injectionMode: InjectionMode.CLASSIC })
})

container.loadModules([
  ['some/path/to/*.js', { register: asClass }]
], {
  resolverOptions: {
    lifetime: Lifetime.SCOPED
  }
})
```

## `createContainer()`

Creates a new Awilix container. The container stuff is documented further down.

Args:

* `options`: Options object. Optional.
  - `options.require`: The function to use when requiring modules. Defaults to `require`. Useful when using something like [`require-stack`](https://npmjs.org/package/require-stack). Optional.
  - `options.injectionMode`: Determines the method for resolving dependencies. Valid modes are:
    - `PROXY`: Uses the `awilix` default dependency resolution mechanism (I.E. injects the cradle into the function or class). This is the default injection mode.
    - `CLASSIC`: Uses the named dependency resolution mechanism. Dependencies ___must___ be named exactly like they are in the registration. For example, a dependency registered as `repository` cannot be referenced in a class constructor as `repo`.

## `asFunction()`

Used with `container.register({ userService: asFunction(makeUserService) })`. Tells Awilix to invoke the function without any context.

The returned resolver has the following chainable (fluid) API:

* `asFunction(fn).setLifetime(lifetime: string)`: sets the lifetime of the registration to the given value.
* `asFunction(fn).transient()`: same as `asFunction(fn).setLifetime(Lifetime.TRANSIENT)`.
* `asFunction(fn).scoped()`: same as `asFunction(fn).setLifetime(Lifetime.SCOPED)`.
* `asFunction(fn).singleton()`: same as `asFunction(fn).setLifetime(Lifetime.SINGLETON)`.
* `asFunction(fn).inject(injector: Function)`: Let's you provide local dependencies only available to this module. The `injector` gets the container passed as the first and only argument and should return an object.

## `asClass()`

Used with `container.register({ userService: asClass(UserService) })`. Tells Awilix to instantiate the given function as a class using `new`.

The returned resolver has the same chainable API as [`asFunction`](#asfunction).

## `asValue()`

Used with `container.register({ dbHost: asValue('localhost') })`. Tells Awilix to provide the given value as-is.

## `aliasTo()`

Resolves the dependency specified.

```js
container.register({
  val: asValue(123),
  aliasVal: aliasTo('val)
})

container.resolve('aliasVal') === container.resolve('val')
```

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
const listModules = require('awilix').listModules

const result = listModules([
  'services/*.js'
])

console.log(result)
  // << [{ name: 'someService', path: 'path/to/services/someService.js' }]
```

**Important**: `listModules` relies on `glob` and therefore does not with bundlers like Webpack, Rollup and Browserify.

## `AwilixResolutionError`

This is a special error thrown when Awilix is unable to resolve all dependencies (due to missing or cyclic dependencies). You can catch this error and use `err instanceof AwilixResolutionError` if you wish. It will tell you what dependencies it could not find or which ones caused a cycle.

## The `AwilixContainer` object

The container returned from `createContainer` has some methods and properties.

### `container.cradle`

**Behold! This is where the magic happens!** The `cradle` is a proxy, and all getters will trigger a `container.resolve`. The `cradle` is actually being
passed to the constructor/factory function, which is how everything gets wired up.

### `container.registrations`

A read-only getter that returns the internal registrations. When invoked on a *scope*, will show registrations for it's parent, and it's parent's parent, and so on.

Not really useful for public use.

### `container.cache`

An object used internally for caching resolutions. It's a plain object.
Not meant for public use but if you find it useful, go ahead but tread carefully.

Each scope has it's own cache, and checks the cache of it's parents.

### `container.options`

Options passed to `createContainer` are stored here.

```js
let counter = 1
container.register({
  count: asFunction(() => counter++).singleton()
})

container.cradle.count === 1
container.cradle.count === 1

delete container.cache.count
container.cradle.count === 2
```

### `container.resolve()`

Resolves the registration with the given name. Used by the cradle.

**Signature**

* `resolve<T>(name: string, [resolveOpts: ResolveOptions]): T`

```js
container.registerFunction({
  leet: () => 1337
})

container.resolve('leet') === 1337
container.cradle.leet === 1337
```

The optional `resolveOpts` has the following fields:

* `allowUnregistered`: if `true`, returns `undefined` when the dependency does not exist, instead of throwing an error.

### `container.register()`

**Signatures**

* `register(name: string, resolver: Resolver): AwilixContainer`
* `register(nameAndResolverPair: NameAndResolverPair): AwilixContainer`

Registers modules with the container. This function is used by the `registerValue`, `registerFunction` and `registerClass` functions.

Awilix needs to know how to resolve the modules, so let's pull out the
resolver functions:

```js
const awilix = require('awilix')
const { asValue, asFunction, asClass } = awilix
```

* `asValue`: Resolves the given value as-is.
* `asFunction`: Resolve by invoking the function with the container cradle as the first and only argument.
* `asClass`: Like `asFunction` but uses `new`.

Now we need to use them. There are multiple syntaxes for the `register` function, pick the one you like the most - or use all of them, I don't really care! :sunglasses:

**Both styles supports chaining! `register` returns the container!**

```js
// name-resolver
container.register('connectionString', asValue('localhost:1433;user=...'))
container.register('mailService', asFunction(makeMailService))
container.register('context', asClass(SessionContext))

// object
container.register({
  connectionString: asValue('localhost:1433;user=...'),
  mailService: asFunction(makeMailService, { lifetime: Lifetime.SINGLETON }),
  context: asClass(SessionContext, { lifetime: Lifetime.SCOPED })
})

// `registerFunction` and `registerClass` also supports a fluid syntax.
// This...
container.register('mailService', asFunction(makeMailService).setLifetime(Lifetime.SINGLETON))
// .. is the same as this:
container.register('context', asClass(SessionContext).singleton())

// .. and here are the other `Lifetime` variants as fluid functions.
container.register('context', asClass(SessionContext).transient())
container.register('context', asClass(SessionContext).scoped())
```

**The object syntax, key-value syntax and chaining are valid for all `register` calls!**

### `container.registerValue()`

**Signatures**

* `registerValue(name: string, value: any): AwilixContainer`
* `registerValue(nameAndValuePairs: RegisterNameAndValuePair): AwilixContainer `

Registers a constant value in the container. Can be anything.

```js
container.registerValue({
  someName: 'some value',
  db: myDatabaseObject
})

// Alternative syntax:
container.registerValue('someName', 'some value')
container.registerValue('db', myDatabaseObject)

// Chaining
container
  .registerValue('someName', 'some value')
  .registerValue('db', myDatabaseObject)
```

### `container.registerFunction()`

**Signatures**

* `registerFunction(fn: Function, opts?: ResolverOptions): AwilixContainer` (infers the name using `fn.name`)
* `registerFunction(name: string, fn: Function, opts?: ResolverOptions): AwilixContainer`
* `registerFunction(name: string, funcAndOptionsPair: [Function, ResolverOptions]): AwilixContainer`
* `registerFunction(nameAndFunctionPair: RegisterNameAndFunctionPair): AwilixContainer`

Registers a standard function to be called whenever being resolved. The factory function can return anything it wants, and whatever it returns is what is passed to dependents.

By default all registrations are `TRANSIENT`, meaning resolutions will **not** be cached. This is configurable on a per-resolver level.

**The array syntax for values means `[value, options]`.** This is also valid for `registerClass`.

```js
const myFactoryFunction = ({ someName }) => (
  `${new Date().toISOString()}: Hello, this is ${someName}`
)

container.registerFunction({ fullString: myFactoryFunction })
console.log(container.cradle.fullString)
// << 2016-06-24T16:00:00.00Z: Hello, this is some value

// Wait 2 seconds, try again
setTimeout(() => {
  console.log(container.cradle.fullString)
  // << 2016-06-24T16:00:02.00Z: Hello, this is some value

  // The timestamp is different because the
  // factory function was called again!
}, 2000)

// Let's try this again, but we want it to be
// cached!
const Lifetime = awilix.Lifetime
container.registerFunction({
  fullString: [myFactoryFunction, { lifetime: Lifetime.SINGLETON }]
})

console.log(container.cradle.fullString)
// << 2016-06-24T16:00:02.00Z: Hello, this is some value

// Wait 2 seconds, try again
setTimeout(() => {
  console.log(container.cradle.fullString)
  // << 2016-06-24T16:00:02.00Z: Hello, this is some value

  // The timestamp is the same, because
  // the factory function's result was cached.
}, 2000)
```

### `container.registerClass()`

**Signatures**

* `registerClass<T>(ctor: Constructor<T>, opts?: ResolverOptions): AwilixContainer` (infers the name using `ctor.name`)
* `registerClass<T>(name: string, ctor: Constructor<T>, opts?: ResolverOptions): AwilixContainer`
* `registerClass<T>(name: string, ctorAndOptionsPair: [Constructor<T>, ResolverOptions]): AwilixContainer`
* `registerClass(nameAndClassPair: RegisterNameAndClassPair): AwilixContainer`

Same as `registerFunction`, except it will use `new`.

By default all registrations are `TRANSIENT`, meaning resolutions will **not** be cached. This is configurable on a per-resolver level.

```js
class Exclaimer {
  constructor({ fullString }) {
    this.fullString = fullString
  }

  exclaim() {
    return this.fullString + '!!!!!'
  }
}

container.registerClass({
  exclaimer: Exclaimer
})

// or, to easily set up Lifetime..
container.registerClass({
  exclaimer: [Exclaimer, Lifetime.SINGLETON]
})

// or, to fully customize options..
container.registerClass({
  exclaimer: [Exclaimer, { lifetime: Lifetime.SINGLETON }]
})

container.cradle.exclaimer.exclaim()
// << 2016-06-24T17:00:00.00Z: Hello, this is some value!!!!!
```

### `container.loadModules()`

Given an array of globs, registers the modules and returns the container.

Awilix will use `require` on the loaded modules, and register the default-exported function or class as the name of the file.

**This uses a heuristic to determine if it's a constructor function (`function Database() {...}`); if the function name starts with a capital letter, it will be `new`ed!**

Args:

* `globPatterns`: Array of glob patterns that match JS files to load.
* `opts.cwd`: The `cwd` being passed to `glob`. Defaults to `process.cwd()`.
* `opts.formatName`: Can be either `'camelCase'`, or a function that takes the current name as the first parameter and returns the new name. Default is to pass the name through as-is. The 2nd parameter is a full module descriptor.
* `resolverOptions`: An `object` passed to the resolvers. Used to configure the lifetime, injection mode and more of the loaded modules.

Example:

```js
// index.js
container.loadModules([
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
])

container.cradle.userService.getUser(123)

// to configure lifetime for all modules loaded..
container.loadModules([
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
], {
  resolverOptions: {
    lifetime: Lifetime.SINGLETON
  }
})

container.cradle.userService.getUser(123)

// to configure lifetime for specific globs..
container.loadModules([
  ['services/*.js', Lifetime.SCOPED], // all services will have scoped lifetime
  'repositories/*.js',
  'db/db.js'
], {
  resolverOptions: {
    lifetime: Lifetime.SINGLETON // db and repositories will be singleton
  }
})

container.cradle.userService.getUser(123)

// to use camelCase for modules where filenames are not camelCase
container.loadModules([
  'repositories/account-repository.js',
  'db/db.js'
], {
  formatName: 'camelCase'
})

container.cradle.accountRepository.getUser(123)

// to customize how modules are named in the container (and for injection)
container.loadModules([
  'repository/account.js',
  'service/email.js'
], {
  // This formats the module name so `repository/account.js` becomes `accountRepository`
  formatName: (name, descriptor) => {
    const splat = descriptor.path.split('/')
    const namespace = splat[splat.length - 2] // `repository` or `service`
    const upperNamespace = namespace.charAt(0).toUpperCase() + namespace.substring(1)
    return name + upperNamespace
  }
})

container.cradle.accountRepository.getUser(123)
container.cradle.emailService.sendEmail('test@test.com', 'waddup')
```

The `['glob', Lifetime.SCOPED]` syntax is a shorthand for passing in resolver options like so: `['glob', { lifetime: Lifetime.SCOPED }]`

### `container.createScope()`

Creates a new scope. All registrations with a `Lifetime.SCOPED` will be cached inside a scope. A scope is basically a "child" container.

* returns `AwilixContainer`

```js
// Increments the counter every time it is resolved.
let counter = 1
container.register({
  counterValue: asFunction(() => counter++).scoped()
})
const scope1 = container.createScope()
const scope2 = container.createScope()

const scope1Child = scope1.createScope()

scope1.cradle.counterValue === 1
scope1.cradle.counterValue === 1
scope2.cradle.counterValue === 2
scope2.cradle.counterValue === 2

scope1Child.cradle.counterValue === 1
```

**Be careful!** If a scope's *parent* has already resolved a scoped value, that value will be returned.

```js
let counter = 1
container.register({
  counterValue: asFunction(() => counter++).scoped()
})
const scope1 = container.createScope()
const scope2 = container.createScope()

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
})

// Create a scope and register a value.
const scope = container.createScope()
scope.register({
  someValue: asValue('scope')
})

scope.cradle.scopedValue === 'Hello scope'
container.cradle.someValue
// throws AwilixResolutionException
// because the root container does not know
// of the resolver.
```

Things registered in the scope take precedence over it's parent.

```js
// It does not matter when the scope is created,
// it will still have anything that is registered
// in it's parent.
const scope = container.createScope()

container.register({
  value: asValue('root'),
  usedValue: asFunction((cradle) => cradle.value)
})

scope.register({
  value: asValue('scope')
})

container.cradle.usedValue === 'root'
scope.cradle.usedValue === 'scope'
```

### `container.build()`

Builds an instance of a class (or a function) by injecting dependencies, but without registering it in the container.

It's basically a shortcut for `asClass(MyClass).resolve(container)`.

Args:
  - `targetOrResolver`: A class, function or resolver (example: `asClass(..)`, `asFunction(..)`)
  - `opts`: Resolver options.

Returns an instance of whatever is passed in, or the result of calling the resolver. 

**Important**: if you are doing this often for the same class/function, consider using the explicit approach and save the resolver, **especially** if you are using classic resolution because it scans the class constructor/function when calling `asClass(Class)` / `asFunction(func)`.

```js
// The following are equivelant..
class MyClass {
  constructor ({ ping }) {
    this.ping = ping
  }

  pong() {
    return this.ping
  }
}

const createMyFunc = ({ ping }) => ({
  pong: () => ping
})

container.registerValue({
  ping: 'pong'
})

// Shorthand
// This uses `utils.isClass()` to determine whether to 
// use `asClass` or `asFunction`. This is fine for 
// one-time resolutions.
const myClass = container.build(MyClass)
const myFunc = container.build(createMyFunc)

// Explicit
// Save the resolver if you are planning on invoking often.
// **Especially** if you're using classic resolution.
const myClassResolver = asClass(MyClass)
const myFuncResolver = asFunction(MyFunc)

const myClass = container.build(myClassResolver)
const myFunc = container.build(myFuncResolver)

```

# Contributing

Clone repo, run `npm i` to install all dependencies, and then `npm run test-watch` + `npm run lint-watch` to start writing code.

For code coverage, run `npm run cover`.

If you submit a PR, please aim for 100% code coverage and no linting errors.
Travis will fail if there are linting errors. Thank you for considering contributing. :)

# What's in a name?

Awilix is the mayan goddess of the moon, and also my favorite character in the game [SMITE](http://www.smitegame.com/play-for-free?ref=Jeffijoe).

# Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)
