import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AwilixError, AwilixRegistrationError } from '../errors.ts'

test('creates a stack in runtimes without Error.captureStackTrace', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Error,
    'captureStackTrace',
  )!
  let error: AwilixError
  Reflect.deleteProperty(Error, 'captureStackTrace')
  try {
    error = new AwilixError('test message')
  } finally {
    Object.defineProperty(Error, 'captureStackTrace', descriptor)
  }

  assert.match(error.stack!, /test message/)
})

test('formats a registration error without a detail message', () => {
  assert.strictEqual(
    new AwilixRegistrationError('service').message,
    "Could not register 'service'.",
  )
})
