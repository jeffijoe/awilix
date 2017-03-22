//import mocha and mocha-typescript
import 'mocha'
import { suite, test } from 'mocha-typescript'

//require chai and use should assertions
let chai = require('chai')
chai.should()

//import awilix definitions
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  AwilixContainer,
  ContainerOptions,
  Lifetime
} from '../index'

/**
 * Test class for container.
 * @class TestClass
 */
class TestClass { }

/**
 * Test function for container.
 * @function testFunction
 */
function testFunction() { }

/**
 * Test value for container.
 */
const VALUE: string = 'foo'

/**
 * Test the AwilixContainer class.
 * @class TestAwilixContainer
 */
@suite
class TestAwilixContainer {

  private container: AwilixContainer

  /**
   * Before each test hook.
   * @method before
   */
  public beforeEach() {
    //create container
    this.container = createContainer()

    //register tests
    this.container.register({
      testClass: asClass<TestClass>(TestClass),
      testFunction: asFunction(testFunction),
      testValue: asValue(VALUE)
    })
  }

  /**
   * Test the cradle proxy
   * @method testCradle
   */
  @test('it should have a cradle proxy')
  public testCradle() {
    this.container.cradle.should.be.instanceOf(Proxy)
    this.container.cradle.testClass.should.be.instanceOf(TestClass)
    this.container.cradle.testFunction.should.be.a.function
    this.container.cradle.testValue.should.be.eql(VALUE)
  }

  @test('it should create a scope')
  public testCreateScope() {
    this.container.createScope()
  }

  @test('it should have at least one registration in the container')
  public testRegistrations() {
    this.container.registrations.should.be.an('array').with.lengthOf(3)
  }

  @test('it should register')
  public testRegister() {
    //single class
    this.container.register('_testClass', asClass(TestClass))
    let testClassReference = this.container.resolve<TestClass>('_testClass')
    testClassReference.should.be.an.instanceOf(TestClass)

    //single function
    this.container.register('_testFunction', asFunction(testFunction))
    let testFunctionReference = this.container.resolve<Function>('_testFunction')
    testFunctionReference.should.be.a('function')

    //single value
    this.container.register('_testValue', asValue(VALUE))
    let value = this.container.resolve('_testValue')
    value.should.eql(VALUE)
  }

  @test('it should register a class')
  public testRegisterClass() {
    //single
    this.container.registerClass('_testClass', TestClass)
    let testClassReference = this.container.resolve<TestClass>('_testClass')
    testClassReference.should.be.an.instanceOf(TestClass)

    //name and value pair
    this.container.registerClass<TestClass>({
      '__testClass': TestClass
    })
    let testClassReference2 = this.container.resolve<TestClass>('__testClass')
    testClassReference2.should.be.an.instanceOf(TestClass)
  }

  @test('it should register a function')
  public testRegisterFunction() {
    //single
    this.container.registerFunction('_testFunction', testFunction)
    let testFunctionReference = this.container.resolve('_testFunction')
    testFunctionReference.should.be.a('function')

    //name and value pair
    this.container.registerFunction({
      '__testFunction': testFunction
    })
    let testFunctionReference2 = this.container.resolve('__testFunction')
    testFunctionReference2.should.be.a('function')
  }

  @test('it should register a value')
  public testRegisterValue() {
    //single
    this.container.registerValue('_testValue', VALUE)
    let value = this.container.resolve('_testValue')
    value.should.eql(VALUE)

    //name and value pair
    this.container.registerValue({
      '__testValue': VALUE
    })
    let value2 = this.container.resolve('__testValue')
    value2.should.be.eql(VALUE)
  }
}
