import { describe, expect, it, xit } from "@jest/globals";
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

describe("tokenize (white box testing)", () => {
  it("parses text char-by-char", () => {
    whiteBoxTest([]);
    whiteBoxTest([..."Hello, world!"]);
  });

  xit("defers text parsing when ambiguous", () => {
    whiteBoxTest([..."Hello,", "\r\n", ..."world!"]);
    whiteBoxTest([..."John ", "&amp;", ..." Mary"]);
    whiteBoxTest([..."Here we have foo ", "< ", ..."bar"]);
  });

  it("parses tags", () => {
    whiteBoxTest(["<a>", ..."Hi", "</a>"]);
    whiteBoxTest(["<div>", "</div>"]);
    whiteBoxTest(["<br/>"]);
    whiteBoxTest(["<br >"]);
    whiteBoxTest(["<a/b>"]);
    whiteBoxTest([..."a", "<a>", ..."b", "</a>", ..."c"]);
    whiteBoxTest(["<a ab=cd>"]);
    whiteBoxTest(["<a a=c>", ...">"]);
    whiteBoxTest(["<a a=\"c\">", ...">"]);
    whiteBoxTest(["<a a=\"c>\" >", ...">"]);
    whiteBoxTest(["<a a='c'>", ...">"]);
    whiteBoxTest(["<a a='c>'>", ...""]);
    whiteBoxTest(["<a a>", ..."=c>"]);
    whiteBoxTest(["<a ==>", ...">"]);
    whiteBoxTest(["<a =>", ...">"]);
    whiteBoxTest(["<a ==\">\">", ...""]);
    whiteBoxTest(["<a =\">", ..."\">"]);
    whiteBoxTest(["<a =='>'>", ...""]);
    whiteBoxTest(["<a ='>", ..."'>"]);
    whiteBoxTest(["<a a b=c>"]);
    whiteBoxTest(["<a a/b=c>"]);
    whiteBoxTest(["<a a/b=>"]);
    whiteBoxTest(["<a a/b>"]);
    whiteBoxTest(["<a a=\">\">"]);
    whiteBoxTest(["<a a= \">\">"]);
    whiteBoxTest(["<a a =\">\">"]);
    whiteBoxTest(["<a a/=\">", ..."\">"]);
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

function whiteBoxTest(parts: string[]) {
  const text = parts.join("");
  const states: Tokenizer[] = [];
  const outputs: Token[][] = [];

  // Check one-step results
  {
    const tokenizer = new Tokenizer();
    states.push(tokenizer);
    const expectedAll: Token[][] = [];
    const resultAll: Token[][] = [];
    for (const part of parts) {
      for (let i = 0; i < part.length; i++) {
        const expected: Token[] = [];
        if (i + 1 === part.length) {
          if (part.startsWith("</")) {
            expected.push(EndTagToken.createRawToken(part));
          } else if (part.startsWith("<")) {
            expected.push(StartTagToken.createRawToken(part));
          } else {
            expected.push(TextToken.createRawToken(part));
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(part[i], (token) => {
          result.push(token);
        }, () => {});
        expectedAll.push(expected);
        resultAll.push(result);
        states.push(tokenizer.clone());
        outputs.push(result);
      }
    }
    expect(resultAll).toEqual(expectedAll);
  }

  // Check multi-step results
  {
    const expectedAll: Record<string, { output: Token[], state: Tokenizer }> = {};
    const resultAll: Record<string, { output: Token[], state: Tokenizer }> = {};
    for (let i = 0; i < text.length; i++) {
      for (let j = i + 2; j <= text.length; j++) {
        const tokenizer = states[i].clone();
        const chunk = text.slice(i, j);
        const expected: Token[] = [];
        for (let k = i; k < j; k++) {
          for (const token of outputs[k]) {
            if (token.type === "Text" && expected.length > 0 && expected[expected.length - 1].type === "Text") {
              const lastToken = expected.pop()! as TextToken;
              const newToken = TextToken.createRawToken(lastToken.raw! + token.raw!);
              expect(lastToken.value + token.value).toBe(newToken.value);
              expected.push(newToken);
            } else {
              if (token.type === "Text") token.value; // touch
              expected.push(token);
            }
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(chunk, (token) => {
          if (token.type === "Text") token.value; // touch
          result.push(token);
        }, () => {});
        expectedAll[`${i}-${j}`] = {
          output: expected,
          state: states[j],
        };
        resultAll[`${i}-${j}`] = {
          output: result,
          state: tokenizer,
        };
      }
    }
    expect(resultAll).toEqual(expectedAll);
  }
}
