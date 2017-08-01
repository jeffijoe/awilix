const isClass = require('../../lib/isClass')

describe('isClass', function () {
  it('returns true for function that start with a capital letter', function () {
    expect(isClass(function Stuff () {})).to.be.true
  })

  it('returns false for function that do not start with a capital letter', function () {
    expect(isClass(function stuff () {})).to.be.false
  })

  it('returns false for other stuff', function () {
    expect(isClass('hello')).to.be.false
    expect(isClass(123)).to.be.false
  })

  it('returns true for classes', function () {
    expect(isClass(class Stuff {})).to.be.true
    expect(isClass(class {})).to.be.true
  })
})
