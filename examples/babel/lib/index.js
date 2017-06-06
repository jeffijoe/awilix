'use strict';

var _ = require('../../../');

var _testService = require('./services/testService');

var _dependentService = require('./services/dependentService');

var container = (0, _.createContainer)({
  resolutionMode: _.ResolutionMode.CLASSIC
});

container.register({
  testService: (0, _.asClass)(_testService.TestService),
  dep: (0, _.asClass)(_dependentService.DependentService)
});

var depService = container.cradle.dep;
console.log(depService.getInnerData());