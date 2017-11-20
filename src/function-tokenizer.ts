/**
 * Token type.
 */
export type TokenType = 'ident' | '(' | ')' | ',' | '=' | 'EOF'

/**
 * Lexer Token.
 */
export interface Token {
  type: TokenType
  value?: string
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
