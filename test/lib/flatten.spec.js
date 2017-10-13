const flatten = require('../../lib/flatten')

describe('flatten', function() {
  it('flattens the array', function() {
    flatten([[1, 2], [3]]).should.deep.equal([1, 2, 3])
  })
})
