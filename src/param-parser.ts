import { tokenizeFunction } from './function-tokenizer'

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
