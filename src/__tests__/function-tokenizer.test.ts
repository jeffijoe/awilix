import { createTokenizer, Token } from '../function-tokenizer'

describe('tokenizer', () => {
  it('returns the expected tokens for a function', () => {
    const tokens = getTokens('function lol(p1)')
    expect(tokens).toEqual([
      { type: 'function' },
      { type: 'ident', value: 'lol' },
      { type: '(' },
      { type: 'ident', value: 'p1' },
      { type: ')' },
      { type: 'EOF' }
    ])
  })

  it('returns the expected tokens for a class', () => {
    const tokens = getTokens('class Hah { constructor(p1, p2) {}}')
    expect(tokens).toEqual([
      { type: 'class' },
      { type: 'ident', value: 'Hah' },
      { type: 'ident', value: 'constructor' },
      { type: '(' },
      { type: 'ident', value: 'p1' },
      { type: ',' },
      { type: 'ident', value: 'p2' },
      { type: ')' },
      { type: 'EOF' }
    ])
  })

  describe('peek', () => {
    it('restores state if callback returns false', () => {
      const tokenizer = createTokenizer('function lol')
      tokenizer.peek(() => {
        tokenizer.next()
        tokenizer.next()
        return false
      })

      expect(tokenizer.next()).toEqual({ type: 'function' })
    })

    it('keeps state if callback returns truthy', () => {
      const tokenizer = createTokenizer('function lol')
      const peeked = tokenizer.peek(() => {
        return [tokenizer.next(), tokenizer.next()]
      })
      expect(peeked).toEqual([
        { type: 'function' },
        { type: 'ident', value: 'lol' }
      ])
      expect(tokenizer.next()).toEqual({ type: 'EOF' })
    })

    it('restores state if lookAhead is true', () => {
      const tokenizer = createTokenizer('function lol')
      const peeked = tokenizer.peek(() => {
        return [tokenizer.next(), tokenizer.next()]
      }, true)
      expect(peeked).toEqual([
        { type: 'function' },
        { type: 'ident', value: 'lol' }
      ])
      expect(tokenizer.next()).toEqual({ type: 'function' })
    })
  })
})

function getTokens(source: string) {
  const tokenizer = createTokenizer(source)
  let t: Token
  const tokens: Array<Token> = []
  do {
    t = tokenizer.next()
    tokens.push(t)
  } while (t.type !== 'EOF')
  return tokens
}
