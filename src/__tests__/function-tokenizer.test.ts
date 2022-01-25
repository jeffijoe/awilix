import { createTokenizer, Token } from '../../lib/function-tokenizer'

describe('tokenizer', () => {
  it('returns the expected tokens for a function', () => {
    const tokens = getTokens('function lol(p1)')
    expect(tokens).toEqual([
      { type: 'function' },
      { type: 'ident', value: 'lol' },
      { type: '(' },
      { type: 'ident', value: 'p1' },
      { type: ')' },
      { type: 'EOF' },
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
      { type: 'EOF' },
    ])
  })

  it('does not require the constructor to be first', () => {
    const tokens = getTokens(
      'class Hah { wee = "propinit"; method(lol, haha = 123, p = "i shall constructor your jimmies") {} constructor(p1, p2) {}}'
    )
    expect(tokens).toContainEqual({ type: 'ident', value: 'constructor' })
    expect(tokens).toContainEqual({ type: 'ident', value: 'p1' })
    expect(tokens).toContainEqual({ type: 'ident', value: 'p2' })
  })

  it('includes equals token but skips value correctly', () => {
    expect(
      getTokens('function rofl(p1, p2 = hah, p3 = 123.45)')
    ).toMatchSnapshot()

    expect(
      getTokens(
        `function rofl(p1 = 'wee', p2 = "woo", p3 = \`haha "lol" 'dude'\`)`
      )
    ).toMatchSnapshot()
  })

  it('can skip strings with escape seqs in them', () => {
    expect(
      getTokens(
        `function rofl(p1 = 'we\\'e', p2 = "wo\\"o", p3 = \`haha \\\`lol" 'dude'\`)`
      )
    ).toMatchSnapshot()
  })

  it('can skip interpolated strings', () => {
    expect(
      getTokens(`function intstring1(p1 = \`Hello \${world}\`, p2 = 123)`)
    ).toMatchSnapshot()
    expect(
      getTokens(
        `function intstring2(deep = \`Hello$ \${stuff && \`another $\{func(\`"haha"\`, man = 123)}\`}\`, asFuck = 123)`
      )
    ).toMatchSnapshot()
  })

  it('can skip object literals', () => {
    expect(
      getTokens(
        `function obj(p1 = {waddup: 'homie'}, p2 = ({ you: gotThis('dawg:)', \`$\{bruh("hah" && fn(1,2,3))}\`) }), p3 = 123)`
      )
    ).toMatchSnapshot()
  })

  it('can skip function calls', () => {
    expect(
      getTokens(
        `function funcCalls(first = require('path'), other = require(\`some-$\{module && "yeah"}\`))`
      )
    ).toMatchSnapshot()
  })

  it('can tokenize arrow functions', () => {
    expect(
      getTokens(
        `(first = require('path'), other = require(\`some-$\{module && "yeah"}\`)) => {}`
      )
    ).toMatchSnapshot()
  })

  it('does not require function name', () => {
    expect(getTokens(`function (first, second)`)).toMatchSnapshot()
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
