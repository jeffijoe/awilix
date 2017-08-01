// These tests are not run, they are only here to verify typings.

//import awilix definitions
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  AwilixContainer,
  ContainerOptions,
  listModules,
  Lifetime,
  ResolutionMode
} from '../index'

/**
 * Test class for container.
 * @class TestClass
 */
class TestClass {
  constructor (s: string, n: number) {}

  stuff (str: string): void {}
}

/**
 * Test function for container.
 * @function testFunction
 */
function testFunction(str: string) { }

/**
 * Test value for container.
 */
const VALUE: string = 'foo'

const container = createContainer()
const scope: AwilixContainer = container.createScope()
container.register({
  testClass: asClass<TestClass>(TestClass).inject(container => ({ value: 42 })),
  testClass2: asClass(TestClass),
  testFunction: asFunction(testFunction),
  testValue: asValue(VALUE)
})

container.cradle.testClass;
container.cradle.testFunction;
container.cradle.testValue;

container.registrations[0].resolve
container.registrations[0].lifetime
container.register('_testClass', asClass(TestClass))
const testClass: TestClass = container.resolve<TestClass>('_testClass')
testClass.stuff("Hello")

const testFunc = container.resolve<typeof testFunction>('_testFunction')
testFunc("")
const testFunc2 = container.resolve<(s: string) => void>('_testFunction')
testFunc2("")

container.register('_testValue', asValue(VALUE))

container.registerClass<TestClass>(TestClass)
container.registerClass<TestClass>('__testClass', TestClass)
container.registerClass('__testClass', TestClass)
container.registerClass('__testClass', TestClass, { lifetime: Lifetime.SCOPED })
container.registerClass('__testClass', [TestClass, { lifetime: Lifetime.SCOPED }])
container.registerClass({
  __testClass: TestClass,
  __testClass2: [TestClass, {}]
})

container.registerFunction(testFunction, { lifetime: Lifetime.SCOPED })
container.registerFunction('__testClass', testFunction)
container.registerFunction('__testClass', testFunction, { resolutionMode: ResolutionMode.CLASSIC })
container.registerFunction('__testClass', [testFunction, { resolutionMode: ResolutionMode.CLASSIC }])
container.registerFunction({
  __testFunction: testFunction,
  __testFunction2: [testFunction, { injector: (c) => ({ hehe: 42 })}]
})

container.registerValue({
  __testValue: VALUE
})

container.loadModules(['*.js'], {
  formatName: (name, descriptor) => descriptor.path
})
container.loadModules([
  ['hello.js', { lifetime: Lifetime.SCOPED, register: asClass }],
  ['world.js', { injector: (c) => ({ hah: 123 }) }]
], {
  registrationOptions: {
    register: asFunction,
    lifetime: Lifetime.SCOPED
  }
})
listModules('')
listModules([''])
listModules([
  ['hello.js', { lifetime: Lifetime.SCOPED }]
])
