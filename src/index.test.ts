import { describe, expect, it } from "@jest/globals";
import { Token, TextToken, StartTagToken, EndTagToken } from "./token";
import { ParseError, Tokenizer } from "./index";

describe("tokenize", () => {
  it("tokenizes the empty text", async () => {
    ensureTokenization([]);
  });
  it("tokenizes simple texts", async () => {
    ensureTokenization([
      ["Hello, world!", [TextToken.createRawToken("Hello, world!")]],
    ]);
    ensureTokenization([
      ["See <", [TextToken.createRawToken("See ")]],
    ]);
    ensureTokenization([
      ["See <>", [TextToken.createRawToken("See <>")]],
    ]);
    ensureTokenization([
      ["Hello.</", [TextToken.createRawToken("Hello.")]],
    ]);
    // ensureTokenization([
    //   ["Hello.</#", [TextToken.createRawToken("Hello.</#")]],
    // ]);
  });
  it("tokenizes open tags", async () => {
    ensureTokenization([
      ["<div>", [StartTagToken.createRawToken("<div>")]],
      "<",
      ["div><", [StartTagToken.createRawToken("<div>")]],
      ["div><", [StartTagToken.createRawToken("<div>")]],
      ["div><d", [StartTagToken.createRawToken("<div>")]],
      ["iv><d", [StartTagToken.createRawToken("<div>")]],
      ["iv><div", [StartTagToken.createRawToken("<div>")]],
      [">", [StartTagToken.createRawToken("<div>")]],
    ]);
    ensureTokenization([
      ["Hello, <strong>", [TextToken.createRawToken("Hello, "), StartTagToken.createRawToken("<strong>")]],
    ]);
  });

  it("tokenizes end tags", async () => {
    ensureTokenization([
      ["<div>", [StartTagToken.createRawToken("<div>")]],
      "</",
      ["div><", [EndTagToken.createRawToken("</div>")]],
      ["div><", [StartTagToken.createRawToken("<div>")]],
      ["/div><d", [EndTagToken.createRawToken("</div>")]],
      ["iv></d", [StartTagToken.createRawToken("<div>")]],
      ["iv><div", [EndTagToken.createRawToken("</div>")]],
      [">", [StartTagToken.createRawToken("<div>")]],
    ]);
  });

  it("tokenizes open tags with attributes", async () => {
    ensureTokenization([
      ["<div foo=bar>", [StartTagToken.createRawToken("<div foo=bar>")]],
      ["<div foo=\"bar\">", [StartTagToken.createRawToken("<div foo=\"bar\">")]],
      ["<div foo='bar'>", [StartTagToken.createRawToken("<div foo='bar'>")]],
      ["<div foo=bar>foo>", [StartTagToken.createRawToken("<div foo=bar>"), TextToken.createRawToken("foo>")]],
      ["<div foo=\"bar>foo\">", [StartTagToken.createRawToken("<div foo=\"bar>foo\">")]],
      ["<div foo='bar>foo'>", [StartTagToken.createRawToken("<div foo='bar>foo'>")]],
      ["<div foo = \"bar>foo\">", [StartTagToken.createRawToken("<div foo = \"bar>foo\">")]],
      ["<div foo = 'bar>foo'>", [StartTagToken.createRawToken("<div foo = 'bar>foo'>")]],
      ["<div fo=o=\"bar>foo\">", [StartTagToken.createRawToken("<div fo=o=\"bar>"), TextToken.createRawToken("foo\">")]],
      ["<div fo=o='bar>foo'>", [StartTagToken.createRawToken("<div fo=o='bar>"), TextToken.createRawToken("foo'>")]],
      ["<div =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div =foo=\"bar>foo\">")]],
      ["<div =foo='bar>foo'>", [StartTagToken.createRawToken("<div =foo='bar>foo'>")]],
      ["<div=== foo=\"bar>foo\">", [StartTagToken.createRawToken("<div=== foo=\"bar>foo\">")]],
      ["<div=== foo='bar>foo'>", [StartTagToken.createRawToken("<div=== foo='bar>foo'>")]],
      ["<div a foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a foo=\"bar>foo\">")]],
      ["<div a foo='bar>foo'>", [StartTagToken.createRawToken("<div a foo='bar>foo'>")]],
      ["<div a=b foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a=b foo=\"bar>foo\">")]],
      ["<div a=b foo='bar>foo'>", [StartTagToken.createRawToken("<div a=b foo='bar>foo'>")]],
      ["<div a / foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a / foo=\"bar>foo\">")]],
      ["<div a / foo='bar>foo'>", [StartTagToken.createRawToken("<div a / foo='bar>foo'>")]],
      ["<div a =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a =foo=\"bar>"), TextToken.createRawToken("foo\">")]],
      ["<div a =foo='bar>foo'>", [StartTagToken.createRawToken("<div a =foo='bar>"), TextToken.createRawToken("foo'>")]],
      ["<div a=b =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a=b =foo=\"bar>foo\">")]],
      ["<div a=b =foo='bar>foo'>", [StartTagToken.createRawToken("<div a=b =foo='bar>foo'>")]],
      ["<div a / =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a / =foo=\"bar>foo\">")]],
      ["<div a / =foo='bar>foo'>", [StartTagToken.createRawToken("<div a / =foo='bar>foo'>")]],
    ]);
    ensureTokenization([
      "<div f",
      ["oo=bar>", [StartTagToken.createRawToken("<div foo=bar>")]],
      "<div f",
      ["oo=\"bar\">", [StartTagToken.createRawToken("<div foo=\"bar\">")]],
      "<div f",
      ["oo='bar'>", [StartTagToken.createRawToken("<div foo='bar'>")]],
      "<div f",
      ["oo=bar>foo>", [StartTagToken.createRawToken("<div foo=bar>"), TextToken.createRawToken("foo>")]],
      "<div f",
      ["oo=\"bar>foo\">", [StartTagToken.createRawToken("<div foo=\"bar>foo\">")]],
      "<div f",
      ["oo='bar>foo'>", [StartTagToken.createRawToken("<div foo='bar>foo'>")]],
      "<div f",
      ["oo = \"bar>foo\">", [StartTagToken.createRawToken("<div foo = \"bar>foo\">")]],
      "<div f",
      ["oo = 'bar>foo'>", [StartTagToken.createRawToken("<div foo = 'bar>foo'>")]],
      "<div f",
      ["o=o=\"bar>foo\">", [StartTagToken.createRawToken("<div fo=o=\"bar>"), TextToken.createRawToken("foo\">")]],
      "<div f",
      ["o=o='bar>foo'>", [StartTagToken.createRawToken("<div fo=o='bar>"), TextToken.createRawToken("foo'>")]],
      "<div =",
      ["foo=\"bar>foo\">", [StartTagToken.createRawToken("<div =foo=\"bar>foo\">")]],
      "<div =",
      ["foo='bar>foo'>", [StartTagToken.createRawToken("<div =foo='bar>foo'>")]],
      "<div=== f",
      ["oo=\"bar>foo\">", [StartTagToken.createRawToken("<div=== foo=\"bar>foo\">")]],
      "<div=== f",
      ["oo='bar>foo'>", [StartTagToken.createRawToken("<div=== foo='bar>foo'>")]],
      "<div a",
      [" foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a foo=\"bar>foo\">")]],
      "<div a",
      [" foo='bar>foo'>", [StartTagToken.createRawToken("<div a foo='bar>foo'>")]],
      "<div a",
      ["=b foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a=b foo=\"bar>foo\">")]],
      "<div a",
      ["=b foo='bar>foo'>", [StartTagToken.createRawToken("<div a=b foo='bar>foo'>")]],
      "<div a",
      [" / foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a / foo=\"bar>foo\">")]],
      "<div a",
      [" / foo='bar>foo'>", [StartTagToken.createRawToken("<div a / foo='bar>foo'>")]],
      "<div a",
      [" =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a =foo=\"bar>"), TextToken.createRawToken("foo\">")]],
      "<div a",
      [" =foo='bar>foo'>", [StartTagToken.createRawToken("<div a =foo='bar>"), TextToken.createRawToken("foo'>")]],
      "<div a",
      ["=b =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a=b =foo=\"bar>foo\">")]],
      "<div a",
      ["=b =foo='bar>foo'>", [StartTagToken.createRawToken("<div a=b =foo='bar>foo'>")]],
      "<div a",
      [" / =foo=\"bar>foo\">", [StartTagToken.createRawToken("<div a / =foo=\"bar>foo\">")]],
      "<div a",
      [" / =foo='bar>foo'>", [StartTagToken.createRawToken("<div a / =foo='bar>foo'>")]],
    ]);
  });
});

type TokenStreamExpectation = (string | [string, Token[], ParseError[]?])[];

function ensureTokenization(expectation: TokenStreamExpectation) {
  const tokenizer = new Tokenizer();
  const result: TokenStreamExpectation = [];
  for (const chunkAndMeta of expectation) {
    const chunk = typeof chunkAndMeta === "string" ? chunkAndMeta : chunkAndMeta[0];
    const tokens: Token[] = [];
    const errors: ParseError[] = [];
    tokenizer.addChunk(chunk, (token) => {
      tokens.push(token);
    }, (error) => {
      errors.push(error);
    });
    if (errors.length > 0 ) {
      result.push([chunk, tokens, errors]);
    } else if (tokens.length > 0) {
      result.push([chunk, tokens]);
    } else {
      result.push(chunk);
    }
  }
  expect(result).toEqual(expectation);
}
