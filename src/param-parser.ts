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
  const { peek, next: _next, done } = createTokenizer(source)
  const params: Array<Parameter> = []

  const history: Array<Token> = []
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
        nextToken()
        if (peek().type === 'ident') {
          // This is the function name. Skip it.
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
        params.push({ name: t.value!, optional: false })
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
   * Determines if the current token represents a constructor,
   */
  function isConstructorToken() {
    return t.type === 'ident' && t.value === 'constructor'
  }

  /**
   * Advances the tokenizer and stores the previous token in history
   */
  function nextToken() {
    history.unshift(t)
    t = _next()
    return t
  }

  /**
   * Returns an error describing an unexpected token.
   */
  function unexpected() {
    /* istanbul ignore next */
    return new SyntaxError(
      `Parsing parameter list, did not expect ${t.type} token${t.value &&
        ` (${t.value})`}`
    )
  }
}

/*
export function parseParameterList(source: string): Array<string> {
  const tokens = tokenizeFunction(source)
  const params = []
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i]
    if (t.type === ')') {
      break
    }
    if (t.type === 'ident') {
      if (t.value === 'function') {
        t = tokens[++i]
        if (t.type === 'ident') {
          t = tokens[++i]
        }
        // We know its "(", so advance right away.
        t = tokens[++i]
        if (t.type === ')') {
          break
        }
      } else if (t.value === 'class') {
        // Skip until we reach the constructor method.
        do {
          t = tokens[++i]
          if (t.type === 'EOF') {
            return params
          }
          if (t.type !== 'ident') {
            continue
          }
          if (t.value === 'constructor') {
            t = tokens[++i] // "("
            while (t.type !== ')') {
              t = tokens[++i]
              if (t.type === 'ident') {
                params.push(t.value!)
              }
            }
            return params
          }
        } while (true)
      }
      params.push(t.value!)
    }
  }
  return params
}
*/
