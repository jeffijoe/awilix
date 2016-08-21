const last = require('../../lib/last')

describe('last', function() {
  it('returns the last element', function() {
    last([1, 2, 3]).should.equal(3)
  })
})