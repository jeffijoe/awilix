/**
 * Token type.
 */
export type TokenType =
  | 'ident'
  | '('
  | ')'
  | ','
  | '='
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
 * Creates a tokenizer for the specified source.
 *
 * @param source
 */
export function createTokenizer(source: string) {
  const end = source.length
  let pos: number = 0
  let type: TokenType = 'EOF'
  let value: string = ''

  return {
    next,
    peek
  }

  /**
   * Advances the tokenizer and returns the next token.
   */
  function next(): Token {
    advance()
    if (value) {
      return { value, type }
    }
    return { type }
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
      if (isWhiteSpace(ch)) {
        pos++
        continue
      }

      switch (ch) {
        case '(':
        case ')':
        case ',':
          pos++
          return (type = ch)
        default:
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
   * Invokes the `callback` which can advance the tokenizer.
   * If the callback returns a falsy value, or if `lookAhead` is `true`,
   * rewinds the state to what it was before calling `peek`.
   *
   * @param callback
   * @param lookAhead
   */
  function peek<T>(callback: () => T, lookAhead: boolean = false): T {
    const oldPos = pos
    const oldType = type
    const oldValue = value
    const result = callback()
    if (!result || lookAhead) {
      pos = oldPos
      type = oldType
      value = oldValue
    }
    return result
  }
}

/**
 * Determines if the given character is a whitespace character.
 *
 * @param  {string}  ch
 * @return {Boolean}
 */
function isWhiteSpace(ch: string) {
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
 * @return {Boolean}
 */
function isStringQuote(ch: string) {
  switch (ch) {
    case "'":
    case '"':
    case '`':
      return true
  }
  return false
}

const IDENT_START_EXPR = /^[_$a-zA-Z\xA0-\uFFFF]$/
const IDENT_PART_EXPR = /^[_$a-zA-Z0-9\xA0-\uFFFF]$/

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

/**
 * Tokenizes the given source string.
 *
 * @param  {string} source
 * The source.
 *
 * @param  {number} stopAfter
 * Stops parsing after having parsed this amount of tokens.
 *
 * @return {Array<{ type: string, value: string }>}
 */
export function tokenizeFunction(
  source: string,
  stopAfter?: number
): Array<Token> {
  let pos = 0
  let ch
  const tokens: Array<Token> = []
  while (true) {
    if (stopAfter && tokens.length >= stopAfter) {
      return tokens
    }
    ch = source[pos]
    if (pos === source.length) {
      tokens.push({ type: 'EOF' })
      break
    }

    if (isWhiteSpace(ch)) {
      pos++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: '(' })
      pos++
      continue
    }

    if (ch === ')') {
      tokens.push({ type: ')' })
      pos++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: ',' })
      pos++
      continue
    }

    // Basic support for default params, discard everything until next comma or closing paren,
    // skip strings entirely.
    if (ch === '=') {
      if (source[pos + 1] === '>') {
        // Arrow func, we're done.
        tokens.push({ type: 'EOF' })
        break
      }
      tokens.push({ type: '=' })
      let isInString = false
      do {
        ch = source[pos++]
        if (pos === source.length) {
          tokens.push({ type: 'EOF' })
          break
        }

        if (isStringQuote(ch)) {
          isInString = !isInString
        }
      } while ((ch !== ',' && ch !== ')') || isInString)
      pos--
    }

    const identBuf = []
    while (true) {
      ch = source[pos]
      if (pos === source.length) {
        tokens.push({ type: 'EOF' })
        return tokens
      }
      if (ch === '(' || ch === ',' || ch === ')' || isWhiteSpace(ch)) {
        break
      }
      identBuf.push(ch)
      pos++
    }
    if (identBuf.length > 0) {
      tokens.push({ type: 'ident', value: identBuf.join('') })
    }
  }

  return tokens
}
