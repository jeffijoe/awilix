# Awilix

[![npm version](https://badge.fury.io/js/awilix.svg)](https://badge.fury.io/js/awilix)
[![Dependency Status](https://david-dm.org/jeffijoe/awilix.svg)](https://david-dm.org/jeffijoe/awilix)
[![devDependency Status](https://david-dm.org/jeffijoe/awilix/dev-status.svg)](https://david-dm.org/jeffijoe/awilix#info=devDependencies)
[![Build Status](https://travis-ci.org/jeffijoe/awilix.svg?branch=master)](https://travis-ci.org/jeffijoe/awilix)
[![Coverage Status](https://coveralls.io/repos/github/jeffijoe/awilix/badge.svg?branch=master)](https://coveralls.io/github/jeffijoe/awilix?branch=master)
[![Code Climate](https://codeclimate.com/github/jeffijoe/awilix/badges/gpa.svg)](https://codeclimate.com/github/jeffijoe/awilix)

Simple **Inversion of Control** (IoC) container for Node with dependency resolution support. Make IoC great again!

## Installation

```
npm install awilix --save
```

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

## API


#### The `awilix` object

When importing `awilix`, you get the following stuff:

* `createContainer`
* `listModules`
* `AwilixResolutionError`

These are documented below.

#### `createContainer()`

Creates a new Awilix container. The container stuff is documented further down.

#### `listModules()`

Returns a promise for a list of {name, path} pairs,
where the name is the module name, and path is the actual
full path to the module.

* `globPatterns`: a glob pattern string, or an array of them.
* `opts.cwd`: The current working directory passed to `glob`. Defaults to `process.cwd()`.
* returns: a `Promise` for an array of objects with:
  - `name`: The module name - e.g. `db`
  - `path`: The path to the module, relative to `options.cwd`

... still not done...


## Contributing

Clone repo, run `npm i` to install all dependencies, and then `npm run test-watch` + `npm run lint-watch` to start writing code.

For code coverage, run `npm run coverage`.

If you submit a PR, please aim for 100% code coverage and no linting errors.
Travis will fail if there are linting errors. Thank you for your considering contributing. :)

## What's in a name?

Awilix is the mayan goddess of the moon, and also my favorite character in the game [SMITE](http://www.smitegame.com/play-for-free?ref=Jeffijoe).

## Author

Jeff Hansen - [@Jeffijoe](https://twitter.com/Jeffijoe)