/*
 * Parses the parameter list of a function string, including ES6 class constructors.
 *
 * NOTE: This is a very crude parser, and only handles basic cases.
 * Simple default params should work (strings, numbers, bools), not function calls.
 *
 * @param {string} source
 * The source of a function to extract the parameter list from
 *
 * @return {Array<string>}
 * Returns an array of parameter names
 */
module.exports = function parseParameterList (source) {
  const tokens = tokenize(source)
  const params = []
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i]
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
                params.push(t.value)
              }
            }
            return params
          }
        } while (true)
      }
      params.push(t.value)
    }
  }
  return params
}

/**
 * Tokenizes the given source string.
 *
 * @param  {string} source
 *
 * @return {Array<{ type: string, value: string }>}
 */
function tokenize (source) {
  let pos = 0
  let ch
  const tokens = []
  while (true) {
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
function isWhiteSpace (ch) {
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
function isStringQuote (ch) {
  switch (ch) {
    case '\'':
    case '"':
    case '`':
      return true
  }
  return false
}
