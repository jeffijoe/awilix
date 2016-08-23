const isFunction = require('../../lib/isFunction')

describe('isFunction', function () {
  it('returns true when the value is a function', function () {
    isFunction(() => {}).should.be.true
    isFunction(function () {}).should.be.true
  })

  it('returns false when the value is not a function', function () {
    isFunction(true).should.be.false
    isFunction(false).should.be.false
    isFunction('').should.be.false
    isFunction('string').should.be.false
    isFunction(123).should.be.false
  })
})
