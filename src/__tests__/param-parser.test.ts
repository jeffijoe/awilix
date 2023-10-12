import { parseParameterList } from '../param-parser'

describe('parseParameterList', () => {
  it('returns an empty array when invalid input is given', () => {
    expect(parseParameterList('')).toEqual([])
  })

  it('supports regular functions', () => {
    expect(
      parseParameterList(
        function hello(dep1: any, dep2: any) {
          /**/
        }.toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
    expect(
      parseParameterList(
        function (dep1: any, dep2: any) {
          /**/
        }.toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
    expect(
      parseParameterList(
        function (dep1: any, dep2: any, dep3: any) {
          /**/
        }.toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
      { name: 'dep3', optional: false },
    ])
    expect(
      parseParameterList(
        function hello() {
          /**/
        }.toString(),
      ),
    ).toEqual([])
    expect(
      parseParameterList(
        function () {
          /**/
        }.toString(),
      ),
    ).toEqual([])
  })

  it('supports regular functions with default params', () => {
    expect(
      parseParameterList(
        `function hello(
          dep1 = 'frick off ricky',
          dep2 = 'shut up randy, go eat some cheeseburgers'
        ) {
        }`,
      ),
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true },
    ])
  })

  it('supports arrow functions', () => {
    expect(
      parseParameterList(
        ((dep1: any, dep2: any) => {
          /**/
        }).toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
    expect(
      parseParameterList(((dep1: any, dep2: any) => 42).toString()),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
    expect(
      parseParameterList(
        ((dep1: any, dep2: any, dep3: any) => {
          /**/
        }).toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
      { name: 'dep3', optional: false },
    ])
    expect(
      parseParameterList(
        (() => {
          /**/
        }).toString(),
      ),
    ).toEqual([])
    expect(parseParameterList((() => 42).toString())).toEqual([])
    expect(parseParameterList(`dep1 => lol`)).toEqual([
      { name: 'dep1', optional: false },
    ])
  })

  it('supports arrow function with default params', () => {
    expect(
      parseParameterList(
        ((dep1 = 123, dep2 = 456) => {
          /**/
        }).toString(),
      ),
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true },
    ])
    expect(
      parseParameterList(((dep1 = 123, dep2 = 456) => 789).toString()),
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true },
    ])
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

    expect(parseParameterList(Test.prototype.constructor.toString())).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
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
    expect(parseParameterList(cls)).toEqual([
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

    expect(parseParameterList(Test.prototype.constructor.toString())).toBe(null)

    expect(parseParameterList('class Lol extends Wee {}')).toBe(null)
  })

  it('supports carriage return in function signature', () => {
    expect(parseParameterList(`function (\r\ndep1,\r\ndep2\r\n) {}`)).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
    ])
  })

  it('supports weird formatting', () => {
    expect(
      parseParameterList(`function(  dep1    \n,\r\n  dep2 = 123 \r\n) {}`),
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: true },
    ])
  })

  it('supports the problem posted in issue #30', () => {
    const fn = function (a: any) {
      return {}
    }

    function fn2(a: any) {
      return {}
    }

    expect(parseParameterList(fn.toString())).toEqual([
      { name: 'a', optional: false },
    ])
    expect(parseParameterList(fn2.toString())).toEqual([
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

    expect(parseParameterList(cls)).toEqual([
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

    expect(parseParameterList(cls)).toEqual([
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

    expect(parseParameterList(cls)).toEqual([
      { name: 'userService', optional: false },
    ])
  })

  it('skips async keyword', () => {
    expect(parseParameterList(`async function (first, second) {}`)).toEqual([
      {
        name: 'first',
        optional: false,
      },
      {
        name: 'second',
        optional: false,
      },
    ])
    expect(parseParameterList(`async (first, second) => {}`)).toEqual([
      {
        name: 'first',
        optional: false,
      },
      {
        name: 'second',
        optional: false,
      },
    ])
    expect(parseParameterList(`async () => {}`)).toEqual([])
    expect(parseParameterList(`async => {}`)).toEqual([
      {
        name: 'async',
        optional: false,
      },
    ])
  })

  it('skips generator star', () => {
    expect(parseParameterList(`async function* (first, second) {}`)).toEqual([
      {
        name: 'first',
        optional: false,
      },
      {
        name: 'second',
        optional: false,
      },
    ])
    expect(parseParameterList(`async function *(first, second) {}`)).toEqual([
      {
        name: 'first',
        optional: false,
      },
      {
        name: 'second',
        optional: false,
      },
    ])
  })
})
