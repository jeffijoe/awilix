'use strict';
const chai = require('chai');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.should();

global.expect = chai.expect;