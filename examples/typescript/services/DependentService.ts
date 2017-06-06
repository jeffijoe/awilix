import TestService from './TestService'

export default class DependentService {
  testService: TestService

  constructor(testService: TestService) {
    this.testService = testService
  }

  getInnerData (): string {
    return this.testService.getData()
  }
}
