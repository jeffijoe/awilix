import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { type Token, createTokenizer } from '../function-tokenizer.ts'

describe('tokenizer', () => {
  it('returns the expected tokens for a function', () => {
    const tokens = getTokens('function lol(p1)')
    assert.deepStrictEqual(tokens, [
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
    assert.deepStrictEqual(tokens, [
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
      'class Hah { wee = "propinit"; method(lol, haha = 123, p = "i shall constructor your jimmies") {} constructor(p1, p2) {}}',
    )
    assert.partialDeepStrictEqual(tokens, [
      { type: 'ident', value: 'constructor' },
      { type: 'ident', value: 'p1' },
      { type: 'ident', value: 'p2' },
    ])
  })

  it('includes equals token but skips value correctly', (t) => {
    t.assert.snapshot(getTokens('function rofl(p1, p2 = hah, p3 = 123.45)'))

    t.assert.snapshot(
      getTokens(
        `function rofl(p1 = 'wee', p2 = "woo", p3 = \`haha "lol" 'dude'\`)`,
      ),
    )
  })

  it('can skip strings with escape seqs in them', (t) => {
    t.assert.snapshot(
      getTokens(
        `function rofl(p1 = 'we\\'e', p2 = "wo\\"o", p3 = \`haha \\\`lol" 'dude'\`)`,
      ),
    )
  })

  it('can skip strings ending with an even number of backslashes', (t) => {
    t.assert.snapshot(
      getTokens(`function rofl(p1 = 'test\\\\', p2 = "test\\\\\\\\", p3)`),
    )
  })

  it('terminates when the last character is a backslash', (t) => {
    t.assert.snapshot(getTokens(`function rofl(p1 = 'test\\`))
  })

  it('terminates when an escape sequence dangles at the end', (t) => {
    t.assert.snapshot(getTokens(`function rofl(p1 = 'test\\\\`))
  })

  it('can skip interpolated strings', (t) => {
    t.assert.snapshot(
      getTokens(`function intstring1(p1 = \`Hello \${world}\`, p2 = 123)`),
    )
    t.assert.snapshot(
      getTokens(
        `function intstring2(deep = \`Hello$ \${stuff && \`another $\{func(\`"haha"\`, man = 123)}\`}\`, asFuck = 123)`,
      ),
    )
  })

  it('can skip object literals', (t) => {
    t.assert.snapshot(
      getTokens(
        `function obj(p1 = {waddup: 'homie'}, p2 = ({ you: gotThis('dawg:)', \`$\{bruh("hah" && fn(1,2,3))}\`) }), p3 = 123)`,
      ),
    )
  })

  it('can skip function calls', (t) => {
    t.assert.snapshot(
      getTokens(
        `function funcCalls(first = require('path'), other = require(\`some-$\{module && "yeah"}\`))`,
      ),
    )
  })

  it('can tokenize arrow functions', (t) => {
    t.assert.snapshot(
      getTokens(
        `(first = require('path'), other = require(\`some-$\{module && "yeah"}\`)) => {}`,
      ),
    )
  })

  it('does not require function name', (t) => {
    t.assert.snapshot(getTokens(`function (first, second)`))
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
