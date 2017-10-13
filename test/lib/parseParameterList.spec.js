const parseParameterList = require('../../lib/parseParameterList')

describe('parseParameterList', function() {
  it('returns an empty array when invalid input is given', function() {
    expect(parseParameterList('')).to.deep.equal([])
  })

  it('supports regular functions', function() {
    expect(
      parseParameterList(function hello(dep1, dep2) {}.toString())
    ).to.deep.equal(['dep1', 'dep2'])
    expect(
      parseParameterList(function(dep1, dep2) {}.toString())
    ).to.deep.equal(['dep1', 'dep2'])
    expect(
      parseParameterList(function(dep1, dep2, dep3) {}.toString())
    ).to.deep.equal(['dep1', 'dep2', 'dep3'])
    expect(parseParameterList(function hello() {}.toString())).to.deep.equal([])
    expect(parseParameterList(function() {}.toString())).to.deep.equal([])
  })

  it('supports regular functions with default params', function() {
    expect(
      parseParameterList(
        function hello(
          dep1 = 'frick off ricky',
          dep2 = 'shut up randy, go eat some cheeseburgers'
        ) {}.toString()
      )
    ).to.deep.equal(['dep1', 'dep2'])
  })

  it('supports arrow functions', function() {
    expect(parseParameterList(((dep1, dep2) => {}).toString())).to.deep.equal([
      'dep1',
      'dep2'
    ])
    expect(parseParameterList(((dep1, dep2) => 42).toString())).to.deep.equal([
      'dep1',
      'dep2'
    ])
    expect(
      parseParameterList(((dep1, dep2, dep3) => {}).toString())
    ).to.deep.equal(['dep1', 'dep2', 'dep3'])
    expect(parseParameterList((() => {}).toString())).to.deep.equal([])
    expect(parseParameterList((() => 42).toString())).to.deep.equal([])
    expect(parseParameterList((dep1 => expect).toString())).to.deep.equal([
      'dep1'
    ])
  })

  it('supports arrow function with default params', function() {
    expect(
      parseParameterList(((dep1 = 123, dep2 = 456) => {}).toString())
    ).to.deep.equal(['dep1', 'dep2'])
    expect(
      parseParameterList(((dep1 = 123, dep2 = 456) => 789).toString())
    ).to.deep.equal(['dep1', 'dep2'])
  })

  it('supports class constructors', function() {
    class Test {
      constructor(dep1, dep2) {
        this.dep1 = dep1
      }

      method() {}
    }

    expect(
      parseParameterList(Test.prototype.constructor.toString())
    ).to.deep.equal(['dep1', 'dep2'])
  })

  it('supports carriage return in function signature', function() {
    expect(
      parseParameterList(`function (\r\ndep1,\r\ndep2\r\n) {}`)
    ).to.deep.equal(['dep1', 'dep2'])
  })

  it('supports weird formatting', function() {
    expect(
      parseParameterList(`function(  dep1    \n,\r\n  dep2 = 123 \r\n) {}`)
    ).to.deep.equal(['dep1', 'dep2'])
  })

  it('supports the problem posted in issue #30', function() {
    const fn = function(a) {
      return {}
    }

    function fn2(a) {
      return {}
    }

    expect(parseParameterList(fn.toString())).to.deep.equal(['a'])
    expect(parseParameterList(fn2.toString())).to.deep.equal(['a'])
  })
})
