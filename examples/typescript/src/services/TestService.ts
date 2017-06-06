export default class TestService {
data: string

  constructor () {
    this.data = 'Hello world!'
  }

  getData (): string {
    return this.data
  }
}
