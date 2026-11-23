import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseParameterList } from '../param-parser.ts'

// https://github.com/jeffijoe/awilix/issues/130
//
// The bug was caused by the tokenizer trying to skip the expression at
// the `=`, but it caused it to skip over the constructor.
// The solution was to add a tokenizer flag to put it into "dumb" mode
// when the parser is skipping to the constructor token. This disables
// the "smart-skipping" of expressions.
test('#130', () => {
  const code = `
class Service2 {
    /**
     * Comment out the return statement and parsing works again.
     *
     * @param {string} aParam
     */
    static someStaticMethod(aParam) {
        return typeof aParam !== 'undefined' ? aParam : 'no param';
    }

    /**
     * This constructor fails because of the static method above.
     *
     * @param {function} injectedService
     */
    constructor(injectedService) {
        console.log(Service2.someStaticMethod(this));
        injectedService(this);
    }
}
  `
  const params = parseParameterList(code)
  assert.deepStrictEqual(params, [{ name: 'injectedService', optional: false }])
})

// https://github.com/jeffijoe/awilix/issues/164
//
// Caused by the `skipUntil` in the tokenizer trying to parse strings when it should just be
// dumb and only care about scanning until the end of the line (single comment) or the end
// of a block comment marker.
test('#164', () => {
  const classCode = `
  class TestClass {
    constructor(injectedService // '

    ) {}
  }
    `

  assert.deepStrictEqual(parseParameterList(classCode), [
    { name: 'injectedService', optional: false },
  ])

  const funcCode = `
  ( // "

) => {}
    `

  assert.deepStrictEqual(parseParameterList(funcCode), [])
})

// https://github.com/jeffijoe/awilix/issues/390
//
// The paran-less arrow function path was being hit after having skipped all
// tokens until finding the `constructor` token.
// The problem was that the tokenizer is instructed to treat `foo.constructor`
// as a single identifier to simplify looking for constructor tokens, but
// it wasn't taking `foo?.constructor` into account since at the time optional
// chaining was not part of the language at runtime.
// The fix was to consider `?` as part of the identifier as well.
// This would be problematic if TypeScript's optional parameter syntax `param?`
// was visible in the stringified class code, but that gets transpiled away.
describe('#390', () => {
  test('without a constructor', () => {
    const classCode = `
class TestClass  {
  // Fails because of the two questions marks occurring with the constructor keyword.
  bar() {
    return this?.constructor?.name
  }

  clone() {
    return new this?.constructor()
  }

  clone2() {
    const constructor = this?.constructor
    return constructor.call(this)
  }
}`

    assert.deepStrictEqual(parseParameterList(classCode), null)
  })

  test('with a constructor', () => {
    const classCode = `
class TestClass  {
  // Fails because of the two questions marks occurring with the constructor keyword.
  bar() {
    return this?.constructor?.name
  }

  clone() {
    return new this?.constructor()
  }

  clone2() {
    const constructor = this?.constructor
    return constructor.call(this)
  }

  constructor(injectedService) {}
}`

    assert.deepStrictEqual(parseParameterList(classCode), [
      {
        name: 'injectedService',
        optional: false,
      },
    ])
  })
})

test('string default ending with even backslashes', () => {
  const doubleBackslash = "class Foo { constructor(a = 'test\\\\', b) {} }"
  assert.deepStrictEqual(parseParameterList(doubleBackslash), [
    { name: 'a', optional: true },
    { name: 'b', optional: false },
  ])

  const quadBackslash = "class Foo { constructor(a = 'test\\\\\\\\', b) {} }"
  assert.deepStrictEqual(parseParameterList(quadBackslash), [
    { name: 'a', optional: true },
    { name: 'b', optional: false },
  ])

  const singleBackslashEscape = "function foo(a = 'don\\'t', b) {}"
  assert.deepStrictEqual(parseParameterList(singleBackslashEscape), [
    { name: 'a', optional: true },
    { name: 'b', optional: false },
  ])
})

// https://github.com/jeffijoe/awilix/issues/438
//
// When skipping a default value, the tokenizer only tracked parentheses, so a
// comma inside an object or array literal ended the default value early and
// the rest of the literal was parsed as parameters.
describe('#438', () => {
  test('object literal default with several keys', () => {
    const classCode = `
class Client {
  constructor(logger, options = { retries: 3, timeout: 1000 }, cache) {}
}`
    assert.deepStrictEqual(parseParameterList(classCode), [
      { name: 'logger', optional: false },
      { name: 'options', optional: true },
      { name: 'cache', optional: false },
    ])
  })

  test('array literal default with several items', () => {
    const funcCode = `(logger, tags = ['a', 'b'], cache) => {}`
    assert.deepStrictEqual(parseParameterList(funcCode), [
      { name: 'logger', optional: false },
      { name: 'tags', optional: true },
      { name: 'cache', optional: false },
    ])
  })

  test('nested literals, calls and strings with brackets', () => {
    const funcCode = `function make(
      a = { list: [1, [2, 3]], nested: { x: 1, y: f(1, 2) } },
      b = [{ k: '}', v: ']' }, { k: "{", v: \`[\${1}, 2\` }],
      c = () => { return 1, 2 },
      d
    ) {}`
    assert.deepStrictEqual(parseParameterList(funcCode), [
      { name: 'a', optional: true },
      { name: 'b', optional: true },
      { name: 'c', optional: true },
      { name: 'd', optional: false },
    ])
  })
})

// https://github.com/jeffijoe/awilix/issues/452
// A closing destructuring bracket belongs to the parameter pattern, not to
// its last default value. Skipping it ran past the end of the parameter list.
describe('#452', () => {
  for (const value of ['1', '[]', '{ count: 1, items: [2, 3] }']) {
    test(`ends a destructured object default at its closing brace: ${value}`, () => {
      const classCode = `
class Repo {
  constructor({ db, options = ${value} }) { this.db = db }
  find(id, opts) { return query(id, opts) }
}`
      assert.deepStrictEqual(parseParameterList(classCode), [
        { name: 'db', optional: false },
        { name: 'options', optional: true },
      ])
    })
  }

  test('continues after a destructured array with a final default', () => {
    assert.deepStrictEqual(parseParameterList('function f([a, b = 1], c) {}'), [
      { name: 'a', optional: false },
      { name: 'b', optional: true },
      { name: 'c', optional: false },
    ])
  })
})

// Strings in a class body were read as code, so a glob in a class field
// (`'src/**/*.js'`) opened a block comment that hid the constructor, and
// `"constructor(x)"` in a string was taken as the constructor.
describe('strings in class bodies', () => {
  test('glob string in a class field before the constructor', () => {
    const classCode = `
class Loader {
  pattern = 'src/**/*.js'
  constructor(fs, logger) {}
}`
    assert.deepStrictEqual(parseParameterList(classCode), [
      { name: 'fs', optional: false },
      { name: 'logger', optional: false },
    ])
  })

  test('constructor call text in strings and templates before the constructor', () => {
    const classCode = `
class A {
  m() { return "constructor(x)" }
  e() { return 'it\\'s constructor(y)' }
  n() { return \`call constructor(\${1}) first\` }
  constructor(a, b) {}
}`
    assert.deepStrictEqual(parseParameterList(classCode), [
      { name: 'a', optional: false },
      { name: 'b', optional: false },
    ])
  })

  test('class without a constructor whose strings mention one', () => {
    const classCode = `
class A extends B {
  m() { throw new Error("call constructor(opts) first") }
}`
    assert.strictEqual(parseParameterList(classCode), null)
  })

  test('URL string on one line with the constructor', () => {
    const classCode = `class A{static url="http://x";constructor(e,t){this.e=e}}`
    assert.deepStrictEqual(parseParameterList(classCode), [
      { name: 'e', optional: false },
      { name: 't', optional: false },
    ])
  })

  test('quoted constructor names', () => {
    assert.deepStrictEqual(
      parseParameterList(`
class A {
  m() { return 'x' }
  'constructor'(real) {}
}`),
      [{ name: 'real', optional: false }],
    )
    assert.deepStrictEqual(
      parseParameterList(`
class A {
  m() { return 'x' }
  "constructor"(real) {}
}`),
      [{ name: 'real', optional: false }],
    )
  })

  test('a lone quote in a regex does not hide the constructor', () => {
    const classCode = `
class A {
  quote = /"/
  m(x) { if (x) /'/.test(x) }
  tick = /\`/
  constructor(real) {}
}`
    assert.deepStrictEqual(parseParameterList(classCode), [
      { name: 'real', optional: false },
    ])
  })

  test('divisions in default values', () => {
    assert.deepStrictEqual(
      parseParameterList(`function f(a = x++ / 2, b = 3 / 4, c) {}`),
      [
        { name: 'a', optional: true },
        { name: 'b', optional: true },
        { name: 'c', optional: false },
      ],
    )
  })
})
