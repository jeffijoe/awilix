import { parseParameterList } from '../param-parser'

describe('parseParameterList', function() {
  it('returns an empty array when invalid input is given', function() {
    expect(parseParameterList('')).toEqual([])
  })

  it('supports regular functions', function() {
    expect(
      parseParameterList(
        function hello(dep1: any, dep2: any) {
          /**/
        }.toString()
      )
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false }
    ])
    expect(
      parseParameterList(
        function(dep1: any, dep2: any) {
          /**/
        }.toString()
      )
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false }
    ])
    expect(
      parseParameterList(
        function(dep1: any, dep2: any, dep3: any) {
          /**/
        }.toString()
      )
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
      { name: 'dep3', optional: false }
    ])
    expect(
      parseParameterList(
        function hello() {
          /**/
        }.toString()
      )
    ).toEqual([])
    expect(
      parseParameterList(
        function() {
          /**/
        }.toString()
      )
    ).toEqual([])
  })

  it('supports regular functions with default params', function() {
    expect(
      parseParameterList(
        `function hello(
          dep1 = 'frick off ricky',
          dep2 = 'shut up randy, go eat some cheeseburgers'
        ) {
        }`
      )
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true }
    ])
  })

  it('supports arrow functions', function() {
    expect(
      parseParameterList(
        ((dep1: any, dep2: any) => {
          /**/
        }).toString()
      )
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false }
    ])
    expect(
      parseParameterList(((dep1: any, dep2: any) => 42).toString())
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false }
    ])
    expect(
      parseParameterList(
        ((dep1: any, dep2: any, dep3: any) => {
          /**/
        }).toString()
      )
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false },
      { name: 'dep3', optional: false }
    ])
    expect(
      parseParameterList(
        (() => {
          /**/
        }).toString()
      )
    ).toEqual([])
    expect(parseParameterList((() => 42).toString())).toEqual([])
    expect(parseParameterList(`dep1 => lol`)).toEqual([
      { name: 'dep1', optional: false }
    ])
  })

  it('supports arrow function with default params', function() {
    expect(
      parseParameterList(
        ((dep1 = 123, dep2 = 456) => {
          /**/
        }).toString()
      )
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true }
    ])
    expect(
      parseParameterList(((dep1 = 123, dep2 = 456) => 789).toString())
    ).toEqual([
      { name: 'dep1', optional: true },
      { name: 'dep2', optional: true }
    ])
  })

  it('supports class constructors', function() {
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
      { name: 'dep2', optional: false }
    ])
  })

  it('supports carriage return in function signature', function() {
    expect(parseParameterList(`function (\r\ndep1,\r\ndep2\r\n) {}`)).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: false }
    ])
  })

  it('supports weird formatting', function() {
    expect(
      parseParameterList(`function(  dep1    \n,\r\n  dep2 = 123 \r\n) {}`)
    ).toEqual([
      { name: 'dep1', optional: false },
      { name: 'dep2', optional: true }
    ])
  })

  it('supports the problem posted in issue #30', function() {
    const fn = function(a: any) {
      return {}
    }

    function fn2(a: any) {
      return {}
    }

    expect(parseParameterList(fn.toString())).toEqual([
      { name: 'a', optional: false }
    ])
    expect(parseParameterList(fn2.toString())).toEqual([
      { name: 'a', optional: false }
    ])
  })
})
