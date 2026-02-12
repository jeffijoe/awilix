/**
 * Hyperoptimized camelCase conversion.
 *
 * Single-pass, zero-regex, zero-allocation (beyond the result string).
 * Splits on non-alphanumeric separators and case transitions:
 *   - lowercase/digit followed by uppercase  (e.g. fooBar  → foo|Bar)
 *   - uppercase followed by uppercase+lower   (e.g. HTMLParser → HTML|Parser)
 *
 * First word is lowercased; subsequent words are capitalized (first char
 * uppercased, rest lowercased). A subsequent word that starts with a digit
 * is prefixed with '_'.
 */
export function camelCase(input: string): string {
  const len = input.length
  if (len === 0) {
    return ''
  }

  let result = ''
  let wordIdx = 0
  let wordPos = 0
  let inWord = false
  // Character type of the previous character:
  //   0 = separator / start, 1 = uppercase, 2 = lowercase, 3 = digit
  let prevType = 0

  for (let i = 0; i < len; i++) {
    const c = input.charCodeAt(i)

    // Classify – check lowercase first (most frequent in identifiers).
    const type =
      c >= 97 && c <= 122
        ? 2
        : c >= 65 && c <= 90
          ? 1
          : c >= 48 && c <= 57
            ? 3
            : 0

    if (type === 0) {
      // Non-alphanumeric separator – end the current word.
      if (inWord) {
        wordIdx++
        inWord = false
      }
      prevType = 0
      continue
    }

    if (!inWord) {
      // First alphanumeric char after separator(s) or string start.
      inWord = true
      wordPos = 0
    } else if (type === 1) {
      // Uppercase while already inside a word – detect word boundary.
      if (
        prevType >= 2 || // preceded by lowercase (2) or digit (3)
        (prevType === 1 && // preceded by uppercase …
          i + 1 < len &&
          input.charCodeAt(i + 1) >= 97 &&
          input.charCodeAt(i + 1) <= 122) //   … and followed by lowercase
      ) {
        wordIdx++
        wordPos = 0
      }
    }

    // Emit the character with the correct casing.
    if (wordIdx === 0) {
      // First word – everything lowercase.
      // c | 0x20  sets bit-5, converting A-Z → a-z (no-op for a-z / 0-9).
      result += type === 1 ? String.fromCharCode(c | 0x20) : input[i]
    } else if (wordPos === 0) {
      // First char of a subsequent word.
      if (type === 3) {
        // Digit-leading word: prefix with '_'.
        result += '_'
        result += input[i]
      } else {
        // c & 0x5f  clears bit-5, converting a-z → A-Z (no-op for A-Z).
        result += type === 2 ? String.fromCharCode(c & 0x5f) : input[i]
      }
    } else {
      // Remaining chars of a subsequent word – lowercase.
      result += type === 1 ? String.fromCharCode(c | 0x20) : input[i]
    }

    wordPos++
    prevType = type
  }

  return result
}
