/**
 * Token type.
 */
export type TokenType =
  | 'ident'
  | '('
  | ')'
  | ','
  | '='
  | '*'
  | 'function'
  | 'class'
  | 'EOF'

/**
 * Lexer Token.
 */
export interface Token {
  type: TokenType
  value?: string
}

/**
 * Flags that can be passed to the tokenizer to toggle certain things.
 */
export const enum TokenizerFlags {
  None = 0,
  /**
   * If this is set, the tokenizer will not attempt to be smart about skipping expressions.
   */
  Dumb = 1,
}

/**
 * Creates a tokenizer for the specified source.
 *
 * @param source
 */
export function createTokenizer(source: string) {
  const end = source.length
  let pos: number = 0
  let type: TokenType = 'EOF'
  let value: string = ''
  let flags = TokenizerFlags.None
  // These are used to greedily skip as much as possible.
  // Whenever we reach a paren, we increment these.
  let parenLeft = 0
  let parenRight = 0

  return {
    next,
    done,
  }

  /**
   * Advances the tokenizer and returns the next token.
   */
  function next(nextFlags = TokenizerFlags.None): Token {
    flags = nextFlags
    advance()
    return createToken()
  }

  /**
   * Advances the tokenizer state.
   */
  function advance() {
    value = ''
    type = 'EOF'
    while (true) {
      if (pos >= end) {
        return (type = 'EOF')
      }

      let ch = source.charAt(pos)
      // Whitespace is irrelevant
      if (isWhiteSpace(ch)) {
        pos++
        continue
      }

      switch (ch) {
        case '(':
          pos++
          parenLeft++
          return (type = ch)
        case ')':
          pos++
          parenRight++
          return (type = ch)
        case '*':
          pos++
          return (type = ch)
        case ',':
          pos++
          return (type = ch)
        case '=':
          pos++
          if ((flags & TokenizerFlags.Dumb) === 0) {
            // Not in dumb-mode, so attempt to skip.
            skipExpression()
          }
          // We need to know that there's a default value so we can
          // skip it if it does not exist when resolving.
          return (type = ch)
        case '/':
          pos++
          const nextCh = source.charAt(pos)
          if (nextCh === '/') {
            skipUntil((c) => c === '\n', true)
            pos++
          }
          if (nextCh === '*') {
            skipUntil((c) => {
              const closing = source.charAt(pos + 1)
              return c === '*' && closing === '/'
            }, true)
            pos++
          }
          continue
        default:
          // Scans an identifier.
          if (isIdentifierStart(ch)) {
            scanIdentifier()
            return type
          }

          // Elegantly skip over tokens we don't care about.
          pos++
      }
    }
  }

  /**
   * Scans an identifier, given it's already been proven
   * we are ready to do so.
   */
  function scanIdentifier() {
    const identStart = source.charAt(pos)
    const start = ++pos
    while (isIdentifierPart(source.charAt(pos))) {
      pos++
    }
    value = '' + identStart + source.substring(start, pos)
    type = value === 'function' || value === 'class' ? value : 'ident'
    if (type !== 'ident') {
      value = ''
    }
    return value
  }

  /**
   * Skips everything until the next comma or the end of the parameter list.
   * Checks the parenthesis balance so we correctly skip function calls.
   */
  function skipExpression() {
    skipUntil((ch) => {
      const isAtRoot = parenLeft === parenRight + 1
      if (ch === ',' && isAtRoot) {
        return true
      }

      if (ch === '(') {
        parenLeft++
        return false
      }

      if (ch === ')') {
        parenRight++
        if (isAtRoot) {
          return true
        }
      }

      return false
    })
  }

  /**
   * Skips strings and whilespace until the predicate is true.
   *
   * @param callback stops skipping when this returns `true`.
   * @param dumb if `true`, does not skip whitespace and strings;
   * it only stops once the callback returns `true`.
   */
  function skipUntil(callback: (ch: string) => boolean, dumb = false) {
    while (pos < source.length) {
      let ch = source.charAt(pos)
      if (callback(ch)) {
        return
      }

      if (!dumb) {
        if (isWhiteSpace(ch)) {
          pos++
          continue
        }

        if (isStringQuote(ch)) {
          skipString()
          continue
        }
      }
      pos++
    }
  }

  /**
   * Given the current position is at a string quote, skips the entire string.
   */
  function skipString() {
    const quote = source.charAt(pos)
    pos++
    while (pos < source.length) {
      const ch = source.charAt(pos)
      const prev = source.charAt(pos - 1)
      // Checks if the quote was escaped.
      if (ch === quote && prev !== '\\') {
        pos++
        return
      }

      // Template strings are a bit tougher, we want to skip the interpolated values.
      if (quote === '`') {
        const next = source.charAt(pos + 1)
        if (next === '$') {
          const afterDollar = source.charAt(pos + 2)
          if (afterDollar === '{') {
            // This is the start of an interpolation; skip the ${
            pos = pos + 2
            // Skip strings and whitespace until we reach the ending }.
            // This includes skipping nested interpolated strings. :D
            skipUntil((ch) => ch === '}')
          }
        }
      }

      pos++
    }
  }

  /**
   * Creates a token from the current state.
   */
  function createToken(): Token {
    if (value) {
      return { value, type }
    }
    return { type }
  }

  /**
   * Determines if we are done parsing.
   */
  function done() {
    return type === 'EOF'
  }
}

/**
 * Determines if the given character is a whitespace character.
 *
 * @param  {string}  ch
 * @return {boolean}
 */
function isWhiteSpace(ch: string): boolean {
  switch (ch) {
    case '\r':
    case '\n':
    case ' ':
      return true
  }
  return false
}

/**
 * Determines if the specified character is a string quote.
 * @param  {string}  ch
 * @return {boolean}
 */
function isStringQuote(ch: string): boolean {
  switch (ch) {
    case "'":
    case '"':
    case '`':
      return true
  }
  return false
}

// NOTE: I've added the `.` character so that member expression paths
// are seen as identifiers. This is so we don't get a constructor token for
// stuff like `MyClass.prototype.constructor()`
const IDENT_START_EXPR = /^[_$a-zA-Z\xA0-\uFFFF]$/
const IDENT_PART_EXPR = /^[._$a-zA-Z0-9\xA0-\uFFFF]$/

/**
 * Determines if the character is a valid JS identifier start character.
 */
function isIdentifierStart(ch: string) {
  return IDENT_START_EXPR.test(ch)
}

/**
 * Determines if the character is a valid JS identifier start character.
 */
function isIdentifierPart(ch: string) {
  return IDENT_PART_EXPR.test(ch)
}
