/**
 * Tokenizes the given source string.
 *
 * @param  {string} source
 *
 * @return {Array<{ type: string, value: string }>}
 */
module.exports = function tokenizeFunction(source, stopAfter) {
  let pos = 0
  let ch
  const tokens = []
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
        ch = source[pos]
        if (pos === source.length) {
          tokens.push({ type: 'EOF' })
          break
        }

        if (isStringQuote(ch)) {
          isInString = !isInString
        }
        pos++
      } while ((ch !== ',' && ch !== ')') || isInString)
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
function isWhiteSpace(ch) {
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
function isStringQuote(ch) {
  switch (ch) {
    case "'":
    case '"':
    case '`':
      return true
  }
  return false
}
