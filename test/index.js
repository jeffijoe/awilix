const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

chai.use(sinonChai)
chai.should()

global.expect = chai.expect
global.sinon = sinon
