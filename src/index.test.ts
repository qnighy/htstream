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
