import { parseParameterList } from '../param-parser'

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
  expect(params).toEqual([{ name: 'injectedService', optional: false }])
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

  expect(parseParameterList(classCode)).toEqual([
    { name: 'injectedService', optional: false },
  ])

  const funcCode = `
  ( // "

) => {}
    `

  expect(parseParameterList(funcCode)).toEqual([])
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

    expect(parseParameterList(classCode)).toEqual(null)
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

    expect(parseParameterList(classCode)).toEqual([
      {
        name: 'injectedService',
        optional: false,
      },
    ])
  })
})
