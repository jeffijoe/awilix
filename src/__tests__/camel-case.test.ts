import { camelCase } from '../camel-case'

describe('camelCase', () => {
  it.each([
    // Basic separators
    ['my-cool-service', 'myCoolService'],
    ['my_cool_service', 'myCoolService'],
    ['my.cool.service', 'myCoolService'],
    ['the quick brown fox', 'theQuickBrownFox'],

    // Case transitions
    ['SomeClass', 'someClass'],
    ['FooBar', 'fooBar'],
    ['fooBar', 'fooBar'],
    ['myCoolService', 'myCoolService'],

    // Uppercase sequences
    ['HTMLParser', 'htmlParser'],
    ['XMLHttpRequest', 'xmlHttpRequest'],
    ['simpleXML', 'simpleXml'],
    ['getURLFromString', 'getUrlFromString'],
    ['ABCDef', 'abcDef'],
    ['FOO', 'foo'],
    ['ABC', 'abc'],
    ['FOO_BAR_BAZ', 'fooBarBaz'],
    ['testGUILabel', 'testGuiLabel'],
    ['innerHTML', 'innerHtml'],
    ['fooBAR', 'fooBar'],

    // Digits
    ['TestV2', 'testV2'],
    ['foo123bar', 'foo123bar'],
    ['123foo', '123foo'],
    ['123', '123'],
    ['foo-123-bar', 'foo_123Bar'],
    ['foo_123_bar', 'foo_123Bar'],
    ['version 1.2.10', 'version_1_2_10'],

    // Leading / trailing / repeated separators
    ['__proto__', 'proto'],
    ['_foo_bar_', 'fooBar'],
    ['foo--bar', 'fooBar'],
    ['foo___bar', 'fooBar'],
    ['foo...bar', 'fooBar'],
    ['foo  bar', 'fooBar'],
    ['foo-', 'foo'],
    ['foo_', 'foo'],
    ['foo.', 'foo'],

    // Single / edge characters
    ['a', 'a'],
    ['f', 'f'],
    ['A', 'a'],
    ['already', 'already'],

    // Empty / separator-only
    ['', ''],
    ['--', ''],
    ['__', ''],
    ['..', ''],

    // Mixed separators and case transitions
    ['foo-barBaz', 'fooBarBaz'],
    ['Foo-Bar', 'fooBar'],
    ['MY_COOL_SERVICE', 'myCoolService'],

    // Short words at case boundaries
    ['iPhone', 'iPhone'],
    ['eBay', 'eBay'],
  ])('converts %j to %j', (input, expected) => {
    expect(camelCase(input)).toBe(expected)
  })
})
