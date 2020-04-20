import { asClass, createContainer, InjectionMode } from '../../../'
import { TestService } from './services/testService'
import { DependentService } from './services/dependentService'

const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
})

container.register({
  testService: asClass(TestService),
  dep: asClass(DependentService),
})

const depService = container.cradle.dep
console.log(depService.getInnerData())
