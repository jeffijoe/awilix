// This is largely for testing, but import what we need
import { createContainer, asClass, InjectionMode } from '../../..'
import TestService from './services/TestService'
import DependentService from './services/DependentService'

interface ICradle {
  testService: TestService
  depService: DependentService
}

// Create the container
const container = createContainer<ICradle>({
  injectionMode: InjectionMode.CLASSIC,
  errorOnShorterLivedDependencies: true,
})

// Register the classes
container.register({
  testService: asClass(TestService),
  depService: asClass(DependentService).classic(),
})

// Resolve a dependency using the cradle.
const dep1 = container.cradle.depService
// Resolve a dependency using `resolve`
const dep2 = container.resolve<DependentService>('depService')

// Test that all is well, should produce 'Hello world!'
console.log(dep1.getInnerData())
console.log(dep2.getInnerData())
