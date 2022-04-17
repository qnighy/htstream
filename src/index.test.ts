import { describe, expect, it } from "@jest/globals";
import { ParseError, Token, Tokenizer } from "./index";

describe("tokenize", () => {
  it("tokenizes the empty text", async () => {
    ensureTokenization([]);
  });
  it("tokenizes simple texts", async () => {
    ensureTokenization([
      ["Hello, world!", [{ type: "Text", raw: "Hello, world!"}]],
    ]);
    ensureTokenization([
      ["See <", [{ type: "Text", raw: "See "}]],
    ]);
    ensureTokenization([
      ["See <>", [{ type: "Text", raw: "See <>"}]],
    ]);
    ensureTokenization([
      ["Hello.</", [{ type: "Text", raw: "Hello."}]],
    ]);
    // ensureTokenization([
    //   ["Hello.</#", [{ type: "Text", raw: "Hello.</#"}]],
    // ]);
  });
  it("tokenizes open tags", async () => {
    ensureTokenization([
      ["<div>", [{ type: "StartTag", raw: "<div>"}]],
      "<",
      ["div><", [{ type: "StartTag", raw: "<div>"}]],
      ["div><", [{ type: "StartTag", raw: "<div>"}]],
      ["div><d", [{ type: "StartTag", raw: "<div>"}]],
      ["iv><d", [{ type: "StartTag", raw: "<div>"}]],
      ["iv><div", [{ type: "StartTag", raw: "<div>"}]],
      [">", [{ type: "StartTag", raw: "<div>"}]],
    ]);
    ensureTokenization([
      ["Hello, <strong>", [{ type: "Text", raw: "Hello, " }, { type: "StartTag", raw: "<strong>"}]],
    ]);
  });

  it("tokenizes end tags", async () => {
    ensureTokenization([
      ["<div>", [{ type: "StartTag", raw: "<div>"}]],
      "</",
      ["div><", [{ type: "EndTag", raw: "</div>"}]],
      ["div><", [{ type: "StartTag", raw: "<div>"}]],
      ["/div><d", [{ type: "EndTag", raw: "</div>"}]],
      ["iv></d", [{ type: "StartTag", raw: "<div>"}]],
      ["iv><div", [{ type: "EndTag", raw: "</div>"}]],
      [">", [{ type: "StartTag", raw: "<div>"}]],
    ]);
  });

  it("tokenizes open tags with attributes", async () => {
    ensureTokenization([
      ["<div foo=bar>", [{ type: "StartTag", raw: "<div foo=bar>"}]],
      ["<div foo=\"bar\">", [{ type: "StartTag", raw: "<div foo=\"bar\">"}]],
      ["<div foo='bar'>", [{ type: "StartTag", raw: "<div foo='bar'>"}]],
      ["<div foo=bar>foo>", [{ type: "StartTag", raw: "<div foo=bar>"}, { type: "Text", raw: "foo>" }]],
      ["<div foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div foo=\"bar>foo\">"}]],
      ["<div foo='bar>foo'>", [{ type: "StartTag", raw: "<div foo='bar>foo'>"}]],
      ["<div foo = \"bar>foo\">", [{ type: "StartTag", raw: "<div foo = \"bar>foo\">"}]],
      ["<div foo = 'bar>foo'>", [{ type: "StartTag", raw: "<div foo = 'bar>foo'>"}]],
      ["<div fo=o=\"bar>foo\">", [{ type: "StartTag", raw: "<div fo=o=\"bar>"}, { type: "Text", raw: "foo\">" }]],
      ["<div fo=o='bar>foo'>", [{ type: "StartTag", raw: "<div fo=o='bar>"}, { type: "Text", raw: "foo'>" }]],
      ["<div =foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div =foo=\"bar>foo\">"}]],
      ["<div =foo='bar>foo'>", [{ type: "StartTag", raw: "<div =foo='bar>foo'>"}]],
      ["<div=== foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div=== foo=\"bar>foo\">"}]],
      ["<div=== foo='bar>foo'>", [{ type: "StartTag", raw: "<div=== foo='bar>foo'>"}]],
      ["<div a foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a foo=\"bar>foo\">"}]],
      ["<div a foo='bar>foo'>", [{ type: "StartTag", raw: "<div a foo='bar>foo'>"}]],
      ["<div a=b foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a=b foo=\"bar>foo\">"}]],
      ["<div a=b foo='bar>foo'>", [{ type: "StartTag", raw: "<div a=b foo='bar>foo'>"}]],
      ["<div a / foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a / foo=\"bar>foo\">"}]],
      ["<div a / foo='bar>foo'>", [{ type: "StartTag", raw: "<div a / foo='bar>foo'>"}]],
      ["<div a =foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a =foo=\"bar>"}, { type: "Text", raw: "foo\">" }]],
      ["<div a =foo='bar>foo'>", [{ type: "StartTag", raw: "<div a =foo='bar>"}, { type: "Text", raw: "foo'>" }]],
      ["<div a=b =foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a=b =foo=\"bar>foo\">"}]],
      ["<div a=b =foo='bar>foo'>", [{ type: "StartTag", raw: "<div a=b =foo='bar>foo'>"}]],
      ["<div a / =foo=\"bar>foo\">", [{ type: "StartTag", raw: "<div a / =foo=\"bar>foo\">"}]],
      ["<div a / =foo='bar>foo'>", [{ type: "StartTag", raw: "<div a / =foo='bar>foo'>"}]],
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
