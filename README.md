# Awilix

[![npm](https://img.shields.io/npm/v/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![CI](https://github.com/jeffijoe/awilix/actions/workflows/ci.yml/badge.svg)](https://github.com/jeffijoe/awilix/actions/workflows/ci.yml)
[![Coveralls](https://img.shields.io/coveralls/jeffijoe/awilix.svg?maxAge=1000)](https://coveralls.io/github/jeffijoe/awilix)
[![npm](https://img.shields.io/npm/dt/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![npm](https://img.shields.io/npm/l/awilix.svg?maxAge=1000)](https://github.com/jeffijoe/awilix/blob/master/LICENSE.md)
[![node](https://img.shields.io/node/v/awilix.svg?maxAge=1000)](https://www.npmjs.com/package/awilix)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Extremely powerful **Dependency Injection** (DI) container for JavaScript/Node,
written in [TypeScript](http://typescriptlang.org). **Make IoC great again!**

> Check out this
> [intro to Dependency Injection with Awilix](https://medium.com/@Jeffijoe/dependency-injection-in-node-js-2016-edition-f2a88efdd427)

# Table of Contents

- [Awilix](#awilix)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Lifetime management](#lifetime-management)
  - [Scoped lifetime](#scoped-lifetime)
- [Injection modes](#injection-modes)
- [Auto-loading modules](#auto-loading-modules)
- [Per-module local injections](#per-module-local-injections)
- [Inlining resolver options](#inlining-resolver-options)
- [Disposing](#disposing)
- [API](#api)
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
    - [`container.cradle`](#containercradle)
    - [`container.registrations`](#containerregistrations)
    - [`container.cache`](#containercache)
    - [`container.options`](#containeroptions)
    - [`container.resolve()`](#containerresolve)
    - [`container.register()`](#containerregister)
    - [`container.hasRegistration()`](#containerhasregistration)
    - [`container.loadModules()`](#containerloadmodules)
    - [`container.createScope()`](#containercreatescope)
    - [`container.build()`](#containerbuild)
    - [`container.dispose()`](#containerdispose)
- [Universal Module (Browser Support)](#universal-module-browser-support)
  - [Contributing](#contributing)
- [What's in a name?](#whats-in-a-name)
- [Author](#author)

# Installation

Install with `npm`

```
npm install awilix
```

Or `yarn`

```
yarn add awilix
```

You can also use the [UMD](https://github.com/umdjs/umd) build from `unpkg`

```html
<script src="https://unpkg.com/awilix/lib/awilix.umd.js"/>
<script>
const container = Awilix.createContainer()
</script>
```

# Usage

Awilix has a pretty simple API (but with many possible ways to invoke it). At
minimum, you need to do 3 things:

- Create a container
- Register some modules in it
- Resolve and use!

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

container.register({
  // Here we are telling Awilix how to resolve a
  // userController: by instantiating a class.
  userController: awilix.asClass(UserController)
})

// Let's try with a factory function.
const makeUserService = ({ db }) => {
  // Notice how we can use destructuring
  // to access dependencies
  return {
    getUser: id => {
      return db.query(`select * from users where id=${id}`)
    }
  }
}

container.register({
  // the `userService` is resolved by
  // invoking the function.
  userService: awilix.asFunction(makeUserService)
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
container.register({
  // We can register things as-is - this is not just
  // limited to strings and numbers, it can be anything,
  // really - they will be passed through directly.
  connectionString: awilix.asValue(process.env.CONN_STR),
  timeout: awilix.asValue(1000)
})

// We have now wired everything up!
// Let's use it! (use your imagination with the router thing..)
router.get('/api/users/:id', container.resolve('userController').getUser)

// Alternatively, using the `cradle` proxy..
router.get('/api/users/:id', container.cradle.userController.getUser)

// Using  `container.cradle.userController` is actually the same as calling
// `container.resolve('userController')` - the cradle is our proxy!
```

That example is rather lengthy, but if you extract things to their proper files
it becomes more manageable.

[Check out a working Koa example!](/examples/koa)

# Lifetime management

Awilix supports managing the lifetime of instances. This means that you can
control whether objects are resolved and used once, cached within a certain
scope, or cached for the lifetime of the process.

There are 3 lifetime types available.

- `Lifetime.TRANSIENT`: This is the default. The registration is resolved every
  time it is needed. This means if you resolve a class more than once, you will
  get back a new instance every time.
- `Lifetime.SCOPED`: The registration is scoped to the container - that means
  that the resolved value will be reused when resolved from the same scope (or a
  child scope).
- `Lifetime.SINGLETON`: The registration is always reused no matter what - that
  means that the resolved value is cached in the root container.

They are exposed on the `awilix.Lifetime` object.

```js
const Lifetime = awilix.Lifetime
```

To register a module with a specific lifetime:

```js
const { asClass, asFunction, asValue } = awilix

class MailService {}

container.register({
  mailService: asClass(MailService, { lifetime: Lifetime.SINGLETON })
})

// or using the chaining configuration API..
container.register({
  mailService: asClass(MailService).setLifetime(Lifetime.SINGLETON)
})

// or..
container.register({
  mailService: asClass(MailService).singleton()
})

// or.......
container.register('mailService', asClass(MailService, { lifetime: SINGLETON }))
```

## Scoped lifetime

In web applications, managing state without depending too much on the web
framework can get difficult. Having to pass tons of information into every
function just to make the right choices based on the authenticated user.

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

app.get('/messages', (req, res) => {
  // for each request we get a new message service!
  const messageService = req.scope.resolve('messageService')
  messageService.getMessages().then(messages => {
    res.send(200, messages)
  })
})

// The message service can now be tested
// without depending on any request data!
```

**IMPORTANT!** If a singleton is resolved, and it depends on a scoped or
transient registration, those will remain in the singleton for it's lifetime!

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

Read the documentation for [`container.createScope()`](#containercreatescope)
for more examples.

# Injection modes

The injection mode determines how a function/constructor receives its
dependencies. Pre-2.3.0, only one mode was supported - `PROXY` - which remains
the default mode.

Awilix v2.3.0 introduced an alternative injection mode: `CLASSIC`. The injection
modes are available on `awilix.InjectionMode`

- `InjectionMode.PROXY` (default): Injects a proxy to functions/constructors
  which looks like a regular object.

  ```js
  class UserService {
    constructor(opts) {
      this.emailService = opts.emailService
      this.logger = opts.logger
    }
  }
  ```

  or with destructuring:

  ```js
  class UserService {
    constructor({ emailService, logger }) {
      this.emailService = emailService
      this.logger = logger
    }
  }
  ```

- `InjectionMode.CLASSIC`: Parses the function/constructor parameters, and
  matches them with registrations in the container. `CLASSIC` mode has a 
  slightly higher initialization cost as it has to parse the function/class 
  to figure out the dependencies at the time of registration, however resolving 
  them will be **much faster** than when using `PROXY`. _Don't use `CLASSIC` if 
  you minify your code!_ We recommend using `CLASSIC` in Node and `PROXY` in 
  environments where minification is needed.

  ```js
  class UserService {
    constructor(emailService, logger) {
      this.emailService = emailService
      this.logger = logger
    }
  }
  ```

  Additionally, if the class has a base class but does not declare a constructor of its own, Awilix
  simply invokes the base constructor with whatever dependencies it requires.

  ```js
  class Car {
    constructor(engine) {
      this.engine = engine
    }
  }

  class Porsche extends Car {
    vroom() {
      console.log(this.engine) // whatever "engine" is
    }
  }
  ```

Injection modes can be set per-container and per-resolver. The most specific one
wins.

> Note: I personally don't see why you would want to have different injection
> modes in a project, but if the need arises, Awilix supports it.

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
container.register({
  logger: asClass(Logger, { injectionMode: InjectionMode.CLASSIC })
})
```

**For auto-loading modules**:

```js
const container = createContainer()
container.loadModules(['services/**/*.js', 'repositories/**/*.js'], {
  resolverOptions: {
    injectionMode: InjectionMode.CLASSIC
  }
})
```

Choose whichever fits your style.

- `PROXY` _technically_ allows you to defer pulling dependencies (for circular
  dependency support), but **this isn't recommended**.
- `CLASSIC` feels more like the DI you're used to in other languages.
- `PROXY` is more descriptive, and makes for more readable tests; when unit
  testing your classes/functions without using Awilix, you don't have to worry
  about parameter ordering like you would with `CLASSIC`.
- Performance-wise, `CLASSIC` is _slightly_ faster because it only reads the
  dependencies from the constructor/function _once_ (when `asClass`/`asFunction`
  is called), whereas accessing dependencies on the Proxy _may_ incur slight
  overhead for each resolve.
- **`CLASSIC` will not work when your code is minified!** It reads the function
  signature to determine what dependencies to inject. Minifiers will usually
  mangle these names.

Here's an example outlining the testability points raised.

```js
// CLASSIC
function database(connectionString, timeout, logger) {
  // ...
}

// Shorter, but less readable, order-sensitive
const db = database('localhost:1337;user=123...', 4000, new LoggerMock())

// PROXY
function database({ connectionString, timeout, logger }) {
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

When you have created your container, registering 100's of classes can get
boring. You can automate this by using `loadModules`.

> **Important**: auto-loading looks at a file's **default export**, which can be:
>
> - `module.exports = ...`
> - `module.exports.default = ...`
> - `export default ...`
>
> To load a non-default export, set the `[RESOLVER]` property on it:
>
> ```js
> const { RESOLVER } = require('awilix')
> export class ServiceClass {}
> ServiceClass[RESOLVER] = {}
> ```
>
> Or even more concise using TypeScript:
>
> ```typescript
> // TypeScript
> import { RESOLVER } from 'awilix'
> export class ServiceClass {
>   static [RESOLVER] = {}
> }
> ```

Note that **multiple** services can be registered per file, i.e. it is
possible to have a file with a default export and named exports and for
all of them to be loaded. The named exports do require the `RESOLVER`
token to be recognized.

Imagine this app structure:

- `app`
  - `services`
    - `UserService.js` - exports an ES6 `class UserService {}`
    - `emailService.js` - exports a factory function
      `function makeEmailService() {}`
  - `repositories`
    - `UserRepository.js` - exports an ES6 `class UserRepository {}`
  - `index.js` - our main script

In our main script we would do the following:

```js
const awilix = require('awilix')

const container = awilix.createContainer()

// Load our modules!
container.loadModules([
  // Globs!
  [
    // To have different resolverOptions for specific modules.
    'models/**/*.js',
    {
      register: awilix.asValue,
      lifetime: Lifetime.SINGLETON
    }
  ],
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
    // module to determine what to register as.
    register: awilix.asClass
  }
)

// We are now ready! We now have a userService, userRepository and emailService!
container.resolve('userService').getUser(1)
```

**Important**: Auto-loading relies on `glob` and therefore does not work with
bundlers like Webpack, Rollup and Browserify.

# Per-module local injections

Some modules might need some additional configuration values than just
dependencies.

For example, our `userRepository` wants a `db` module which is registered with
the container, but it also wants a `timeout` value. `timeout` is a very generic
name and we don't want to register that as a value that can be accessed by all
modules in the container (maybe other modules have a different timeout?)

```js
export default function userRepository({ db, timeout }) {
  return {
    find() {
      return Promise.race([
        db.query('select * from users'),
        Promise.delay(timeout).then(() =>
          Promise.reject(new Error('Timed out'))
        )
      ])
    }
  }
}
```

Awilix 2.5 added per-module local injections. The following snippet contains
_all_ the possible ways to set this up.

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
  .register({
    userRepository: asFunction(createUserRepository, {
      injector: () => ({ timeout: 2000 })
    })
  })

  // Stringly-typed shorthand
  .register(
    'userRepository',
    asFunction(createUserRepository, {
      injector: () => ({ timeout: 2000 })
    })
  )

  // with `loadModules`
  .loadModules([['repositories/*.js', { injector: () => ({ timeout: 2000 }) }]])
```

Now `timeout` is only available to the modules it was configured for.

**IMPORTANT**: the way this works is by wrapping the `cradle` in another proxy
that provides the returned values from the `inject` function. This means if you
pass along the injected cradle object, anything with access to it can access the
local injections.

# Inlining resolver options

Awilix 2.8 added support for inline resolver options. This is best explained
with an example.

**services/awesome-service.js**:

```js
import { RESOLVER, Lifetime, InjectionMode } from 'awilix'

export default class AwesomeService {
  constructor(awesomeRepository) {
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
import { createContainer, asClass } from 'awilix'
import AwesomeService from './services/awesome-service.js'

const container = createContainer().register({
  awesomeService: asClass(AwesomeService)
})

console.log(container.registrations.awesomeService.lifetime) // 'SCOPED'
console.log(container.registrations.awesomeService.injectionMode) // 'CLASSIC'
```

Additionally, if we add a `name` field and use `loadModules`, the `name` is used
for registration (ignoring `formatName` if provided).

```diff
// `RESOLVER` is a Symbol.
AwesomeService[RESOLVER] = {
+ name: 'superService',
  lifetime: Lifetime.SCOPED,
  injectionMode: InjectionMode.CLASSIC
}
```

```js
const container = createContainer().loadModules(['services/*.js'])
console.log(container.registrations.superService.lifetime) // 'SCOPED'
console.log(container.registrations.superService.injectionMode) // 'CLASSIC'
```

**Important**: the `name` field is only used by `loadModules`.

# Disposing

As of Awilix v3.0, you can call `container.dispose()` to clear the resolver
cache and call any registered disposers. This is very useful to properly dispose
resources like connection pools, and especially when using watch-mode in your
integration tests.

For example, database connection libraries usually have some sort of `destroy`
or `end` function to close the connection. You can tell Awilix to call these for
you when calling `container.dispose()`.

**Important:** the container being disposed **will not dispose its' scopes**. It
only disposes values **in it's own cache**.

```js
import { createContainer, asClass } from 'awilix'
import pg from 'pg'

class TodoStore {
  constructor({ pool }) {
    this.pool = pool
  }

  async getTodos() {
    const result = await this.pool.query('SELECT * FROM todos')
    return result.rows
  }
}

function configureContainer() {
  return container.register({
    todoStore: asClass(TodoStore),
    pool: asFunction(() => new pg.Pool())
      // Disposables must be either `scoped` or `singleton`.
      .singleton()
      // This is called when the pool is going to be disposed.
      // If it returns a Promise, it will be awaited by `dispose`.
      .disposer(pool => pool.end())
  })
}

const container = configureContainer()
const todoStore = container.resolve('todoStore')

// Later...
container.dispose().then(() => {
  console.log('Container has been disposed!')
})
```

A perfect use case for this would be when using Awilix with an HTTP server.

```js
import express from 'express'
import http from 'http'

function createServer() {
  const app = express()
  const container = configureContainer()
  app.get('/todos', async (req, res) => {
    const store = container.resolve('todoStore')
    const todos = await store.getTodos()
    res.status(200).json(todos)
  })

  const server = http.createServer(app)
  // Dispose container when the server closes.
  server.on('close', () => container.dispose())
  return server
}

test('server does server things', async () => {
  const server = createServer()
  server.listen(3000)

  /// .. run your tests..

  // Disposes everything, and your process no
  // longer hangs on to zombie connections!
  server.close()
})
```

# API

## The `awilix` object

When importing `awilix`, you get the following top-level API:

- `createContainer`
- `listModules`
- `AwilixResolutionError`
- `asValue`
- `asFunction`
- `asClass`
- `aliasTo`
- `Lifetime` - documented above.
- `InjectionMode` - documented above.

These are documented below.

## Resolver options

Whenever you see a place where you can pass in **resolver options**, you can
pass in an object with the following props:

- `lifetime`: An `awilix.Lifetime.*` string, such as `awilix.Lifetime.SCOPED`
- `injectionMode`: An `awilix.InjectionMode.*` string, such as
  `awilix.InjectionMode.CLASSIC`
- `injector`: An injector function - see
  [Per-module local injections](#per-module-local-injections)
- `register`: Only used in `loadModules`, determines how to register a loaded
  module explicitly

**Examples of usage:**

```js
container.register({
  stuff: asClass(MyClass, { injectionMode: InjectionMode.CLASSIC })
})

container.loadModules([['some/path/to/*.js', { register: asClass }]], {
  resolverOptions: {
    lifetime: Lifetime.SCOPED
  }
})
```

## `createContainer()`

Creates a new Awilix container. The container stuff is documented further down.

Args:

- `options`: Options object. Optional.
  - `options.require`: The function to use when requiring modules. Defaults to
    `require`. Useful when using something like
    [`require-stack`](https://npmjs.org/package/require-stack). Optional.
  - `options.injectionMode`: Determines the method for resolving dependencies.
    Valid modes are:
    - `PROXY`: Uses the `awilix` default dependency resolution mechanism (I.E.
      injects the cradle into the function or class). This is the default
      injection mode.
    - `CLASSIC`: Uses the named dependency resolution mechanism. Dependencies
      **_must_** be named exactly like they are in the registration. For
      example, a dependency registered as `repository` cannot be referenced in a
      class constructor as `repo`.

## `asFunction()`

Used with `container.register({ userService: asFunction(makeUserService) })`.
Tells Awilix to invoke the function without any context.

The returned resolver has the following chainable (fluid) API:

- `asFunction(fn).setLifetime(lifetime: string)`: sets the lifetime of the
  registration to the given value.
- `asFunction(fn).transient()`: same as
  `asFunction(fn).setLifetime(Lifetime.TRANSIENT)`.
- `asFunction(fn).scoped()`: same as
  `asFunction(fn).setLifetime(Lifetime.SCOPED)`.
- `asFunction(fn).singleton()`: same as
  `asFunction(fn).setLifetime(Lifetime.SINGLETON)`.
- `asFunction(fn).inject(injector: Function)`: Let's you provide local
  dependencies only available to this module. The `injector` gets the container
  passed as the first and only argument and should return an object.

## `asClass()`

Used with `container.register({ userService: asClass(UserService) })`. Tells
Awilix to instantiate the given function as a class using `new`.

The returned resolver has the same chainable API as [`asFunction`](#asfunction).

## `asValue()`

Used with `container.register({ dbHost: asValue('localhost') })`. Tells Awilix
to provide the given value as-is.

## `aliasTo()`

Resolves the dependency specified.

```js
container.register({
  val: asValue(123),
  aliasVal: aliasTo('val')
})

container.resolve('aliasVal') === container.resolve('val')
```

## `listModules()`

Returns an array of `{name, path}` pairs, where the name is the module name, and
path is the actual full path to the module.

This is used internally, but is useful for other things as well, e.g.
dynamically loading an `api` folder.

Args:

- `globPatterns`: a glob pattern string, or an array of them.
- `opts.cwd`: The current working directory passed to `glob`. Defaults to
  `process.cwd()`.
- **returns**: an array of objects with:
  - `name`: The module name - e.g. `db`
  - `path`: The path to the module relative to `options.cwd` - e.g. `lib/db.js`

Example:

```js
const listModules = require('awilix').listModules

const result = listModules(['services/*.js'])

console.log(result)
// << [{ name: 'someService', path: 'path/to/services/someService.js' }]
```

**Important**: `listModules` relies on `glob` and therefore is not supported
with bundlers like Webpack, Rollup and Browserify.

## `AwilixResolutionError`

This is a special error thrown when Awilix is unable to resolve all dependencies
(due to missing or cyclic dependencies). You can catch this error and use
`err instanceof AwilixResolutionError` if you wish. It will tell you what
dependencies it could not find or which ones caused a cycle.

## The `AwilixContainer` object

The container returned from `createContainer` has some methods and properties.

### `container.cradle`

**Behold! This is where the magic happens!** The `cradle` is a proxy, and all
getters will trigger a `container.resolve`. The `cradle` is actually being
passed to the constructor/factory function, which is how everything gets wired
up.

### `container.registrations`

A read-only getter that returns the internal registrations. When invoked on a
_scope_, will show registrations for it's parent, and it's parent's parent, and
so on.

Not really useful for public use.

### `container.cache`

A `Map<string, CacheEntry>` used internally for caching resolutions. Not meant
for public use but if you find it useful, go ahead but tread carefully.

Each scope has it's own cache, and checks the cache of it's ancestors.

```js
let counter = 1
container.register({
  count: asFunction(() => counter++).singleton()
})

container.cradle.count === 1
container.cradle.count === 1

container.cache.delete('count')
container.cradle.count === 2
```

### `container.options`

Options passed to `createContainer` are stored here.

```js
const container = createContainer({
  injectionMode: InjectionMode.CLASSIC
})

console.log(container.options.injectionMode) // 'CLASSIC'
```

### `container.resolve()`

Resolves the registration with the given name. Used by the cradle.

**Signature**

- `resolve<T>(name: string, [resolveOpts: ResolveOptions]): T`

```js
container.register({
  leet: asFunction(() => 1337)
})

container.resolve('leet') === 1337
container.cradle.leet === 1337
```

The optional `resolveOpts` has the following fields:

- `allowUnregistered`: if `true`, returns `undefined` when the dependency does
  not exist, instead of throwing an error.

### `container.register()`

**Signatures**

- `register(name: string, resolver: Resolver): AwilixContainer`
- `register(nameAndResolverPair: NameAndResolverPair): AwilixContainer`

Awilix needs to know how to resolve the modules, so let's pull out the resolver
functions:

```js
const awilix = require('awilix')
const { asValue, asFunction, asClass } = awilix
```

- `asValue`: Resolves the given value as-is.
- `asFunction`: Resolve by invoking the function with the container cradle as
  the first and only argument.
- `asClass`: Like `asFunction` but uses `new`.

Now we need to use them. There are multiple syntaxes for the `register`
function, pick the one you like the most - or use all of them, I don't really
care! :sunglasses:

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

// `asClass` and `asFunction` also supports a fluid syntax.
// This...
container.register(
  'mailService',
  asFunction(makeMailService).setLifetime(Lifetime.SINGLETON)
)
// .. is the same as this:
container.register('context', asClass(SessionContext).singleton())

// .. and here are the other `Lifetime` variants as fluid functions.
container.register('context', asClass(SessionContext).transient())
container.register('context', asClass(SessionContext).scoped())
```

**The object syntax, key-value syntax and chaining are valid for all `register`
calls!**

### `container.hasRegistration()`

- `container.hasRegistration(name: string | symbol): boolean`

Determines if the container has a registration with the given name. Also checks ancestor containers.

### `container.loadModules()`

Given an array of globs, registers the modules and returns the container.

> 💡 When using `opts.esModules`, a `Promise` is returned due to using the asynchronous `import()`.

Awilix will use `require` on the loaded modules, and register the
default-exported function or class as the name of the file.

**This uses a heuristic to determine if it's a constructor function
(`function Database() {...}`); if the function name starts with a capital
letter, it will be `new`ed!**

Args:

- `globPatterns`: Array of glob patterns that match JS files to load.
- `opts.cwd`: The `cwd` being passed to `glob`. Defaults to `process.cwd()`.
- `opts.formatName`: Can be either `'camelCase'`, or a function that takes the
  current name as the first parameter and returns the new name. Default is to
  pass the name through as-is. The 2nd parameter is a full module descriptor.
- `opts.resolverOptions`: An `object` passed to the resolvers. Used to configure
  the lifetime, injection mode and more of the loaded modules.
- `opts.esModules`: Loads modules using Node's native ES modules. 
  **This makes `container.loadModules` asynchronous, and will therefore return a `Promise`!** 
  This is only  supported on Node 14.0+ and should only be used if you're using 
  the [Native Node ES modules](https://nodejs.org/api/esm.html)

Example:

```js
// index.js
container.loadModules(['services/*.js', 'repositories/*.js', 'db/db.js'])

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
)

container.cradle.userService.getUser(123)

// to use camelCase for modules where filenames are not camelCase
container.loadModules(['repositories/account-repository.js', 'db/db.js'], {
  formatName: 'camelCase'
})

container.cradle.accountRepository.getUser(123)

// to customize how modules are named in the container (and for injection)
container.loadModules(['repository/account.js', 'service/email.js'], {
  // This formats the module name so `repository/account.js` becomes `accountRepository`
  formatName: (name, descriptor) => {
    const splat = descriptor.path.split('/')
    const namespace = splat[splat.length - 2] // `repository` or `service`
    const upperNamespace =
      namespace.charAt(0).toUpperCase() + namespace.substring(1)
    return name + upperNamespace
  }
})

container.cradle.accountRepository.getUser(123)
container.cradle.emailService.sendEmail('test@test.com', 'waddup')
```

The `['glob', Lifetime.SCOPED]` syntax is a shorthand for passing in resolver
options like so: `['glob', { lifetime: Lifetime.SCOPED }]`

**Important**: `loadModules` depends on `fast-glob` and is therefore not supported in
module bundlers like Webpack, Rollup, esbuild and Browserify.

### `container.createScope()`

Creates a new scope. All registrations with a `Lifetime.SCOPED` will be cached
inside a scope. A scope is basically a "child" container.

- returns `AwilixContainer`

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

scope1Child.cradle.counterValue === 3
```

A _Scope_ maintains it's own cache of `Lifetime.SCOPED` registrations, meaning it **does not use the parent's cache** for scoped registrations.

```js
let counter = 1
container.register({
  counterValue: asFunction(() => counter++).scoped()
})
const scope1 = container.createScope()
const scope2 = container.createScope()

// The root container is also a scope.
container.cradle.counterValue === 1
container.cradle.counterValue === 1

// This scope resolves and caches it's own.
scope1.cradle.counterValue === 2
scope1.cradle.counterValue === 2

// This scope resolves and caches it's own.
scope2.cradle.counterValue === 3
scope2.cradle.counterValue === 3
```

A scope may also register additional stuff - they will only be available within
that scope and it's children.

```js
// Register a transient function
// that returns the value of the scope-provided dependency.
// For this example we could also use scoped lifetime.
container.register({
  scopedValue: asFunction(cradle => 'Hello ' + cradle.someValue)
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
  usedValue: asFunction(cradle => cradle.value)
})

scope.register({
  value: asValue('scope')
})

container.cradle.usedValue === 'root'
scope.cradle.usedValue === 'scope'
```

### `container.build()`

Builds an instance of a class (or a function) by injecting dependencies, but
without registering it in the container.

It's basically a shortcut for `asClass(MyClass).resolve(container)`.

Args:

- `targetOrResolver`: A class, function or resolver (example: `asClass(..)`,
  `asFunction(..)`)
- `opts`: Resolver options.

Returns an instance of whatever is passed in, or the result of calling the
resolver.

**Important**: if you are doing this often for the same class/function, consider
using the explicit approach and save the resolver, **especially** if you are
using classic resolution because it scans the class constructor/function when
calling `asClass(Class)` / `asFunction(func)`.

```js
// The following are equivelant..
class MyClass {
  constructor({ ping }) {
    this.ping = ping
  }

  pong() {
    return this.ping
  }
}

const createMyFunc = ({ ping }) => ({
  pong: () => ping
})

container.register({
  ping: asValue('pong')
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

### `container.dispose()`

Returns a `Promise` that resolves when all disposers of cached resolutions have
resolved. **Only cached values will be disposed, meaning they must have a
`Lifetime` of `SCOPED` or `SINGLETON`**, or else they are not cached by the
container and therefore can't be disposed by it.

This also clears the container's cache.

```js
const pg = require('pg')

container.register({
  pool: asFunction(() => new pg.Pool())
    .disposer(pool => pool.end())
    // IMPORTANT! Must be either singleton or scoped!
    .singleton()
})

const pool = container.resolve('pool')
pool.query('...')

// Later..
container.dispose().then(() => {
  console.log('All dependencies disposed, you can exit now. :)')
})
```

# Universal Module (Browser Support)

**As of v3**, Awilix ships with official support for browser environments!

The package includes 4 flavors.

- CommonJS, the good ol' Node format - `lib/awilix.js`
- ES Modules, for use with module bundlers **in Node** - `lib/awilix.module.mjs`
- ES Modules, for use with module bundlers **in the browser** -
  `lib/awilix.browser.js`
- UMD, for dropping it into a script tag - `lib/awilix.umd.js`

The `package.json` includes the proper fields for bundlers like Webpack, Rollup
and Browserify to pick the correct version, so you should not have to configure
anything. 😎

**Important**: the browser builds do not support `loadModules` or `listModules`,
because they depend on Node-specific packages.

**Also important**: due to using `Proxy` + various `Reflect` methods, Awilix is only _supposed_ to work in:

- Chrome >= 49
- Firefox >= 18
- Edge >= 12
- Opera >= 36
- Safari >= 10
- Internet Explorer is not supported

## Contributing

Please see our [contributing.md](./CONTRIBUTING.md)

# What's in a name?

Awilix is the mayan goddess of the moon, and also my favorite character in the
game [SMITE](http://www.smitegame.com/play-for-free?ref=Jeffijoe).

# Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)
