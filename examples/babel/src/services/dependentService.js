export class DependentService {
  constructor(testService) {
    this.testService = testService
  }

  getInnerData() {
    return this.testService.getData()
  }
}
