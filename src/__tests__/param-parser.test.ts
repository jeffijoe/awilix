import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseParameterList } from '../param-parser.ts'

describe('parseParameterList', () => {
  it('reports unexpected tokens at the start of a signature and in its parameters', () => {
    assert.throws(() => parseParameterList('*'), SyntaxError)
    assert.throws(() => parseParameterList('(*)'), SyntaxError)
  })

  it('returns an empty array when invalid input is given', () => {
    assert.deepStrictEqual(parseParameterList(''), [])
  })

  it('supports regular functions', () => {
    assert.deepStrictEqual(
      parseParameterList(
        function hello(dep1: any, dep2: any) {
          /**/
        }.toString(),
      ),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(
        function (dep1: any, dep2: any) {
          /**/
        }.toString(),
      ),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(
        function (dep1: any, dep2: any, dep3: any) {
          /**/
        }.toString(),
      ),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
        { name: 'dep3', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(
        function hello() {
          /**/
        }.toString(),
      ),
      [],
    )
    assert.deepStrictEqual(
      parseParameterList(
        function () {
          /**/
        }.toString(),
      ),
      [],
    )
  })

  it('supports regular functions with default params', () => {
    assert.deepStrictEqual(
      parseParameterList(
        `function hello(
          dep1 = 'frick off ricky',
          dep2 = 'shut up randy, go eat some cheeseburgers'
        ) {
        }`,
      ),
      [
        { name: 'dep1', optional: true },
        { name: 'dep2', optional: true },
      ],
    )
  })

  it('supports arrow functions', () => {
    assert.deepStrictEqual(
      parseParameterList(
        ((dep1: any, dep2: any) => {
          /**/
        }).toString(),
      ),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(((dep1: any, dep2: any) => 42).toString()),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(
        ((dep1: any, dep2: any, dep3: any) => {
          /**/
        }).toString(),
      ),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
        { name: 'dep3', optional: false },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(
        (() => {
          /**/
        }).toString(),
      ),
      [],
    )
    assert.deepStrictEqual(parseParameterList((() => 42).toString()), [])
    assert.deepStrictEqual(parseParameterList(`dep1 => lol`), [
      { name: 'dep1', optional: false },
    ])
  })

  it('supports arrow function with default params', () => {
    assert.deepStrictEqual(
      parseParameterList(
        ((dep1 = 123, dep2 = 456) => {
          /**/
        }).toString(),
      ),
      [
        { name: 'dep1', optional: true },
        { name: 'dep2', optional: true },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(((dep1 = 123, dep2 = 456) => 789).toString()),
      [
        { name: 'dep1', optional: true },
        { name: 'dep2', optional: true },
      ],
    )
  })

  it('supports class constructors', () => {
    class Test {
      dep1: any
      constructor(dep1: any, dep2: any) {
        this.dep1 = dep1
      }

      method() {
        /**/
      }
    }

    assert.deepStrictEqual(
      parseParameterList(Test.prototype.constructor.toString()),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
  })

  it('supports class constructors with a bunch of other shit before it', () => {
    const cls = `
    class Rofl {
      @dec(1, 3, { obj: value })
      someMethod(yeah, boi) {
        const ctor = Rofl.prototype.constructor.call(this, 2)
        return 'heyo' + \` gimme $\{mayo + 10}\`
      }

      static prop = '123'
      @decorated stuff = func(1, 'two')

      constructor(dep1, dep2 = 123) {

      }
    }
    `
    assert.deepStrictEqual(parseParameterList(cls), [
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: true },
    ])
  })

  it('returns null when no constructor is defined', () => {
    class Test {
      dep1: any

      method() {
        /**/
      }
    }

    assert.strictEqual(
      parseParameterList(Test.prototype.constructor.toString()),
      null,
    )

    assert.strictEqual(parseParameterList('class Lol extends Wee {}'), null)
  })

  it('supports carriage return in function signature', () => {
    assert.deepStrictEqual(
      parseParameterList(`function (\r\ndep1,\r\ndep2\r\n) {}`),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: false },
      ],
    )
  })

  it('supports weird formatting', () => {
    assert.deepStrictEqual(
      parseParameterList(`function(  dep1    \n,\r\n  dep2 = 123 \r\n) {}`),
      [
        { name: 'dep1', optional: false },
        { name: 'dep2', optional: true },
      ],
    )
  })

  it('supports the problem posted in issue #30', () => {
    const fn = function (a: any) {
      return {}
    }

    function fn2(a: any) {
      return {}
    }

    assert.deepStrictEqual(parseParameterList(fn.toString()), [
      { name: 'a', optional: false },
    ])
    assert.deepStrictEqual(parseParameterList(fn2.toString()), [
      { name: 'a', optional: false },
    ])
  })

  it('skips line comments', () => {
    const cls = `
class UserController {
  // We are using constructor injection.
  constructor(userService) {
      // Save a reference to our dependency.
      this.userService = userService;
  }

  // imagine ctx is our HTTP request context...
  getUser(ctx) {
      return this.userService.getUser(ctx.params.id)
  }
}
    `

    assert.deepStrictEqual(parseParameterList(cls), [
      { name: 'userService', optional: false },
    ])
  })

  it('skips block comments', () => {
    const cls = `
class UserController {
  /*
    We are using constructor injection.
  */
  constructor(userService) {
      // Save a reference to our dependency.
      this.userService = userService;
  }

  // imagine ctx is our HTTP request context...
  getUser(ctx) {
      return this.userService.getUser(ctx.params.id)
  }
}
    `

    assert.deepStrictEqual(parseParameterList(cls), [
      { name: 'userService', optional: false },
    ])
  })

  it('does not get confused when referencing constructor elsewhere', () => {
    const cls = `
    class UserController {
      @decorator(MyThing.prototype.constructor)
      someField

      /*
        We are using constructor injection.
      */
      constructor(userService) {
          // Save a reference to our dependency.
          this.userService = userService;
      }

      // imagine ctx is our HTTP request context...
      getUser(ctx) {
          return this.userService.getUser(ctx.params.id)
      }
    }
        `

    assert.deepStrictEqual(parseParameterList(cls), [
      { name: 'userService', optional: false },
    ])
  })

  it('skips async keyword', () => {
    assert.deepStrictEqual(
      parseParameterList(`async function (first, second) {}`),
      [
        {
          name: 'first',
          optional: false,
        },
        {
          name: 'second',
          optional: false,
        },
      ],
    )
    assert.deepStrictEqual(parseParameterList(`async (first, second) => {}`), [
      {
        name: 'first',
        optional: false,
      },
      {
        name: 'second',
        optional: false,
      },
    ])
    assert.deepStrictEqual(parseParameterList(`async () => {}`), [])
    assert.deepStrictEqual(parseParameterList(`async => {}`), [
      {
        name: 'async',
        optional: false,
      },
    ])
  })

  it('skips generator star', () => {
    assert.deepStrictEqual(
      parseParameterList(`async function* (first, second) {}`),
      [
        {
          name: 'first',
          optional: false,
        },
        {
          name: 'second',
          optional: false,
        },
      ],
    )
    assert.deepStrictEqual(
      parseParameterList(`async function *(first, second) {}`),
      [
        {
          name: 'first',
          optional: false,
        },
        {
          name: 'second',
          optional: false,
        },
      ],
    )
  })

  it('skips generator star and name of a named generator', () => {
    const expected = [
      { name: 'first', optional: false },
      { name: 'second', optional: false },
    ]
    assert.deepStrictEqual(
      parseParameterList(`function* gen(first, second) {}`),
      expected,
    )
    assert.deepStrictEqual(
      parseParameterList(`function *gen(first, second) {}`),
      expected,
    )
    assert.deepStrictEqual(
      parseParameterList(`async function* gen(first, second) {}`),
      expected,
    )
    assert.deepStrictEqual(
      parseParameterList(
        function* gen(first: unknown, second: unknown) {
          yield [first, second]
        }.toString(),
      ),
      expected,
    )
  })
})
