const {
  flatten,
  isClass,
  isFunction,
  last,
  nameValueToObject,
  uniq
} = require('../../lib/utils')

describe('flatten', function() {
  it('flattens the array', function() {
    flatten([[1, 2], [3]]).should.deep.equal([1, 2, 3])
  })
})

describe('isClass', function() {
  it('returns true for function that start with a capital letter', function() {
    expect(isClass(function Stuff() {})).to.be.true
  })

  it('returns false for function that do not start with a capital letter', function() {
    expect(isClass(function stuff() {})).to.be.false
  })

  it('returns false for other stuff', function() {
    expect(isClass('hello')).to.be.false
    expect(isClass(123)).to.be.false
  })

  it('returns true for classes', function() {
    expect(isClass(class Stuff {})).to.be.true
    expect(isClass(class {})).to.be.true
  })
})

describe('isFunction', function() {
  it('returns true when the value is a function', function() {
    isFunction(() => {}).should.be.true
    isFunction(function() {}).should.be.true
    isFunction(class {}).should.be.true
  })

  it('returns false when the value is not a function', function() {
    isFunction(true).should.be.false
    isFunction(false).should.be.false
    isFunction('').should.be.false
    isFunction('string').should.be.false
    isFunction(123).should.be.false
  })
})

describe('last', function() {
  it('returns the last element', function() {
    last([1, 2, 3]).should.equal(3)
  })
})

describe('nameValueToObject', function() {
  it('converts 2 params to 1', function() {
    const result = nameValueToObject('hello', 'world')
    result.should.be.an('object')
    result.hello.should.equal('world')
  })

  it('uses the object if passed', function() {
    const input = { hello: 'world' }
    const result = nameValueToObject(input)

    result.should.be.an('object')
    result.hello.should.equal('world')
  })
})

describe('uniq', () => {
  it('returns unique items', () => {
    expect(
      uniq(['hello', 'world', 'i', 'say', 'hello', 'world'])
    ).to.deep.equal(['hello', 'world', 'i', 'say'])
  })
})
