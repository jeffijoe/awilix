// This is largely for testing, but import what we need
import { createContainer, asClass, InjectionMode } from '../../../src/awilix'
import TestService from './services/TestService'
import DependentService from './services/DependentService'

// Create the container
const container = createContainer({
  injectionMode: InjectionMode.CLASSIC
})

// Register the classes
container.register({
  testService: asClass(TestService),
  depService: asClass(DependentService).classic()
})

// Resolve a dependency using the cradle.
let dep1: DependentService = container.cradle.depService
// Resolve a dependency using `resolve`
let dep2 = container.resolve<DependentService>('depService')

// Test that all is well, should produce 'Hello world!'
console.log(dep1.getInnerData())
console.log(dep2.getInnerData())
