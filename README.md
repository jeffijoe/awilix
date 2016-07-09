> This is the `v1` branch of Awilix for Node v4 and above. The API in v2 changed dramatically. If you are using Node v6 or above, you should consider migrating to the latest version.

# Awilix

[![npm version](https://badge.fury.io/js/awilix.svg)](https://badge.fury.io/js/awilix)
[![Dependency Status](https://david-dm.org/jeffijoe/awilix.svg)](https://david-dm.org/jeffijoe/awilix)
[![devDependency Status](https://david-dm.org/jeffijoe/awilix/dev-status.svg)](https://david-dm.org/jeffijoe/awilix#info=devDependencies)
[![Build Status](https://travis-ci.org/jeffijoe/awilix.svg?branch=v1)](https://travis-ci.org/jeffijoe/awilix)
[![Coverage Status](https://coveralls.io/repos/github/jeffijoe/awilix/badge.svg?branch=v1)](https://coveralls.io/github/jeffijoe/awilix?branch=v1)
[![Code Climate](https://codeclimate.com/github/jeffijoe/awilix/badges/gpa.svg)](https://codeclimate.com/github/jeffijoe/awilix)

Simple **Inversion of Control** (IoC) container for Node with dependency resolution support. Make IoC great again!

## Installation

```
npm install awilix@1 --save
```

*Requires Node v4 or above, and possibly npm v3.*

## Quick start

Awilix has a pretty simple API. At minimum, you need to do 2 things:

* Create a container
* Register some modules in it

`index.js`

```javascript
const awilix = require('awilix');

// Some module you want to access everywhere.
const database = require('./db');

// Create the container.
const container = awilix.createContainer();

// Register the database module as "db".
container.register({
  db: database
});

// Use it.
container.db.query('SELECT ...');
```

## Awilix: a primer

So the above example is not very interesting though. A reasonably sized project has a few directories with modules that may (or may not) depend on one another.

You *could* just `require` them all in the correct order, but where's the fun in that? Nah, let's have Awilix auto-load our modules and hook them up to the container.

For this mini-tutorial, we will use a todos API as an example.

`services/todosService.js`

```js
// A nice function that takes the container
// as the first argument, and any number of
// additional arguments.
function getTodos(container, searchText) {
  const todos = container.todos;
  return todos.getTodos({ searchText: searchText }).then(result => {
    // Do something useful with the result here.. Or not.
    return result;
  });
}

// Export it so we can test it.
module.exports.getTodos = getTodos;

// To make this module Awilix-compatible, we
// have to use a default export that looks like this:
module.exports.default = (container) => {
  // Expose this module as "todosService"
  container.register({
    todosService: container.bindAll({
      // The todosService has a getTodos function,
      // which needs the container to grab
      // it's dependencies when called.
      getTodos: getTodos
    })
  });
};
```

The first bit is pretty standard, apart from the `container` argument. We basically just treat it as an object that has all the stuff we need - in this
case, a todos repository (exposed as `todos`). How this came to be, we will find out... right now!

`repositories/todosRepository.js`

```js
// This example is written with ES6 import-export syntax,
// as well as ES6 classes just to demonstrate how that works.

export class TodosRepository {
  // We need a database object to query against
  // - we declare this in the constructor.
  // This is called "constructor injection".
  constructor(db) {
    this.db = db;
  }

  // Queries the DB for todos..
  getTodos(query) {
    return this.db.sql(`select * from todos where text like '%${query.searchText}%'`).then(result => {
      // Transform DB result to todos..
      return result.map(todo => {...});
    });
  }
}

// Since we are using constructor injection,
// we can't be sure if "container.db" is available yet,
// so we use the dependsOn API.
export default function (container) {
  // We depend on the module exposed as "db".
  container.dependsOn(['db'], () => {
    // When we get here, we know "db" is ready!
    // Register the repository as "todos".
    container.register({
      todos: new TodosRepository(container.db)
    })
  });
}
```

This time we used a class (instead of functions that take the container as the first argument), and so we used `container.dependsOn` to defer registration
until the `db` module was ready.

For good measure, let's cover the database module as well.

`db/db.js`

```js
// We require the provider here as registering
// it with the container won't be needed.
const someDbProvider = require('some-db-provider');

export function connect() {
  // Returns a promise...
  return someDbProvider.connect({
    host: 'localhost'
  });
}

export default function(container) {
  // We are returning a promise. Yes, this is supported.
  return connect().then(database => {
    container.register({
      db: database
    })
  });
}
```

**Okay!** We have written our modules, now we need to connect them.

In our app's main script (where we imported Awilix), we are going to load our modules. For clarity, I've included everything here.

`index.js`

```js
const awilix = require('awilix');

// Create the container.
const container = awilix.createContainer();

// Load our modules.
container.loadModules([
  // Awilix uses `glob` to resolve modules.
  // If you've used `dependsOn` correctly, or just using
  // the functional aproach (e.g. `todosService.js`), the
  // ordering won't matter.
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
]).then(() => {
  // Our container is ready! Start your server or whatever..
  // Most importantly, we can use our todos service!
  const todosService = container.todosService;

  todosService.getTodos('use awilix').then(todos => {
    // Success! To the pub!
    console.log(todos);
  });
});
```

Note how in `getTodos`, **we did not specify the container as the first argument!** The observant reader may have remembered that we used a little
function called `bindAll` in `todosService.js`.

That's it for the mini-guide. Be sure to read the short API docs below
so you know what's possible.

## The Awilix Container Pattern (ACP)

So in the above example, you might have noticed a pattern:

```js
module.exports = function(container) {
  container.register({
    someStuff: 'yay',
    someFunction: container.bind(someFunction),
    someObject: container.bindAll({
      moreFunctions: moreFunctions
    })
  })
}
```

This is what I refer to as the **Awilix Container Pattern (ACP)**, and is what the `loadModules` API uses to let you register your stuff with the container in a "discovery-based" manner.

To make a module eligible for loading through `loadModules`, it needs a default exported function that takes the container as the first parameter. The function is reponsible for registering things with the container using `container.register`.

An ACP function **MAY**:

* return a `Promise`
* use `container.dependsOn` to declare dependencies up-front (see corresponding section)

Example in ES5:

```js
// When the module does not export anything else..
module.exports = function(container) {

}

// When the module exports more than default.
module.exports.default = function(container) {

}
```

Example in ES6:

```js
export default function(container) {

}

// With an arrow function
export default container => {

};
```

## API

### The `awilix` object

When importing `awilix`, you get the following stuff:

* `createContainer`
* `listModules`
* `AwilixResolutionError`

These are documented below.

### `createContainer()`

Creates a new Awilix container. The container stuff is documented further down.

Args:

* `options`: Options object. Optional.
  - `options.require`: The function to use when requiring modules. Defaults to `require`. Useful when using something like [`require-stack`](https://npmjs.org/package/require-stack). Optional.

### `listModules()`

Returns a promise for a list of `{name, path}` pairs,
where the name is the module name, and path is the actual
full path to the module.

This is used internally, but is useful for other things as well, e.g.
dynamically loading an `api` folder.

Args:

* `globPatterns`: a glob pattern string, or an array of them.
* `opts.cwd`: The current working directory passed to `glob`. Defaults to `process.cwd()`.
* **returns**: a `Promise` for an array of objects with:
  - `name`: The module name - e.g. `db`
  - `path`: The path to the module relative to `options.cwd` - e.g. `lib/db.js`

Example:

```js
const listModules = require('awilix').listModules;

listModules([
  'services/*.js'
]).then(result => {
  console.log(result);
  // << [{ name: 'someService', path: 'path/to/services/someService.js' }]
})
```

### `AwilixResolutionError`

This is a special error thrown when Awilix is unable to resolve all dependencies (due to `dependOn`). You can catch this error and use `err instanceof AwilixResolutionError` if you wish. It will tell you what
dependencies it could not find.

### The `AwilixContainer` object

The container returned from `createContainer` has some methods and properties.

#### `container.registeredModules`

A hash that contains all registered modules. Anything in there will also be present on the `container` itself.

#### `container.bind()`

Creates a new function where the first parameter of the given function will always be the container it was bound to.

Args:

* `fn`: The function to bind.
* `ctx`: The `this`-context for the function.
* **returns**: The bound function.

Example:

```js
container.one = 1;
const myFunction = (container, arg1, arg2) => arg1 + arg2 + container.one;

const bound = container.bind(myFunction);

bound(2, 3);
// << 6
```

#### `container.bindAll()`

Given an object, binds all it's functions to the container and
assigns it to the given object. The object is returned.

Args:

* `obj`: Object with functions to bind.
* **returns**: The input `obj`

Example:

```js
const obj = {
  method1: (container, arg1, arg2) => arg1 + arg2,
  method2: (container, arg1, arg2) => arg1 - arg2
};

const boundObj = container.bindAll(obj);
boundObj === obj;
// << true

obj.method1(1, 2);
// << 3
```

#### `container.register()`

Given an object, registers one or more things with the container. The values can be anything, and therefore are *not bound automatically*.

Args:

* `obj`: Object with things to register. Key is the what others will address the module as, value is the module itself.
* **returns**: The `container`.

Example:

```js
const addTodo = (container, text) => { /* ...*/ };
const connect = container => awesomeDb.connect(container.DB_HOST);

container.register({
  // Any value goes.
  DB_HOST: 'localhost',
  // using bindAll
  todoService: container.bindAll({
    addTodo: addTodo
  }),
  // Not bound.
  log: function(text) {
    console.log('AWILIX DEMO:', text);
  },

  connect: container.bind(connect)
});

// Exposed on the container as well as `registeredModules`.
container.todoService === container.registeredModules.todoService;
// << true

container.todoService.addTodo('follow and start awilix repo');
console.log(container.DB_HOST);
// << localhost

container.log('Hello!');
// << AWILIX DEMO: Hello!

connect();
```

#### `container.loadModules()`

Given an array of globs, returns a `Promise` when loading is done.

Awilix will use `require` on the loaded modules, and call their default exported function (if it *is* a function, that is..) with the container as the first parameter (this is the *Awilix Container Pattern (ACP)*). This function then gets to do the registration of one or more modules.

Args:

* `globPatterns`: Array of glob patterns that match JS files to load.
* `opts.cwd`: The `cwd` being passed to `glob`. Defaults to `process.cwd()`.
* **returns**: A `Promise` for when we're done. This won't be resolved until all modules are ready.

Example:

```js
// index.js
container.loadModules([
  'services/*.js',
  'repositories/*.js',
  'db/db.js'
]).then(() => {
  console.log('We are ready!');
  container.todoService.addTodo('go to the pub');
});
```

#### `container.dependsOn()`

Used in conjunction with `loadModules`, makes it easy to state up-front what
your module needs, and then get notified once it's ready. This is useful for doing constructor injection where you grab the dependencies off the container
at construction time rather than at function-call-time.

*I recommend using the functional approach as it's less complex, but if you must, this method works perfectly fine as well. It's just a bit more verbose.*

Args:

* `dependencies`: Array of strings that map to the modules being grabbed off the container - e.g. `'db'` when using `container.db`.
* **returns**: A dependency token (an internal thing, don't mind this).

Example:

```js
// repositories/todosRepository.js
class TodosRepository {
  constructor(dependencies) {
    // We save the reference here, so it *has* to exist at construction-time!
    this.db = dependencies.db;
  }
}

// We are not using any named exports, so we
// don't have to use module.exports.default.
module.exports = container => {
  container.dependsOn(['db'], () => {
    container.register({
      todos: new TodosRepository(container)
    })
  });
}
```

## Contributing

Clone repo, run `npm i` to install all dependencies, and then `npm run test-watch` + `npm run lint-watch` to start writing code.

For code coverage, run `npm run coverage`.

If you submit a PR, please aim for 100% code coverage and no linting errors.
Travis will fail if there are linting errors. Thank you for your considering contributing. :)

## What's in a name?

Awilix is the mayan goddess of the moon, and also my favorite character in the game [SMITE](http://www.smitegame.com/play-for-free?ref=Jeffijoe).

## Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)
