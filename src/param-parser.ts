import { createTokenizer, Token } from './function-tokenizer'

/**
 * A parameter for a function.
 */
export interface Parameter {
  /**
   * Parameter name.
   */
  name: string
  /**
   * True if the parameter is optional.
   */
  optional: boolean
}

/*
 * Parses the parameter list of a function string, including ES6 class constructors.
 *
 * @param {string} source
 * The source of a function to extract the parameter list from
 *
 * @return {Array<Parameter>}
 * Returns an array of parameters.
 */
export function parseParameterList(source: string): Array<Parameter> {
  const { next: _next, done } = createTokenizer(source)
  const params: Array<Parameter> = []

  let t: Token = null!
  nextToken()
  while (!done()) {
    switch (t.type) {
      case 'class':
        skipUntilConstructor()
        // Next token is the constructor identifier.
        nextToken()
        break
      case 'function':
        const next = nextToken()
        if (next.type === 'ident' || next.type === '*') {
          // This is the function name or a generator star. Skip it.
          nextToken()
        }
        break
      case '(':
        // Start parsing parameter names.
        parseParams()
        break
      case ')':
        // We're now out of the parameter list.
        return params
      case 'ident':
        // Likely a paren-less arrow function
        // which can have no default args.
        const param = { name: t.value!, optional: false }
        if (t.value === 'async') {
          // Given it's the very first token, we can assume it's an async function,
          // so skip the async keyword.
          const next = nextToken()
          if (next && next.type !== '=') {
            break
          }
        }
        params.push(param)
        return params
      /* istanbul ignore next */
      default:
        throw unexpected()
    }
  }

  return params

  /**
   * After having been placed within the parameter list of
   * a function, parses the parameters.
   */
  function parseParams() {
    // Current token is a left-paren
    let param: Parameter = { name: '', optional: false }
    while (!done()) {
      nextToken()
      switch (t.type) {
        case 'ident':
          param.name = t.value!
          break
        case '=':
          param.optional = true
          break
        case ',':
          params.push(param)
          param = { name: '', optional: false }
          break
        case ')':
          if (param.name) {
            params.push(param)
          }
          return
        /* istanbul ignore next */
        default:
          throw unexpected()
      }
    }
  }

  /**
   * Skips until we reach the constructor identifier.
   */
  function skipUntilConstructor() {
    while (!isConstructorToken() && !done()) {
      nextToken()
    }
  }

  /**
   * Determines if the current token represents a constructor, and the next token after it is a paren
   */
  function isConstructorToken() {
    return t.type === 'ident' && t.value === 'constructor'
  }

  /**
   * Advances the tokenizer and stores the previous token in history
   */
  function nextToken() {
    t = _next()
    return t
  }

  /**
   * Returns an error describing an unexpected token.
   */
  /* istanbul ignore next */
  function unexpected() {
    return new SyntaxError(
      `Parsing parameter list, did not expect ${t.type} token${
        t.value ? ` (${t.value})` : ''
      }`
    )
  }
}
