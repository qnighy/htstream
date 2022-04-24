import { describe, expect, it } from "@jest/globals";
import { Token, createRawTextToken, createRawStartTagToken, createRawEndTagToken, textValue, RawTextToken } from "./token";
import { Tokenizer } from "./index";

describe("tokenize", () => {
  it("tokenizes the empty text", async () => {
    expect(tokenizeAll([])).toEqual([]);
  });
  it("tokenizes simple texts", async () => {
    expect(tokenizeAll(["Hello, world!"])).toEqual([
      createRawTextToken("Hello, world!"),
    ]);
    expect(tokenizeAll(["Hello, ", "world!"])).toEqual([
      createRawTextToken("Hello, "),
      createRawTextToken("world!"),
    ]);
  });
});

describe("tokenize (white box testing)", () => {
  it("parses text char-by-char", () => {
    whiteBoxTest([]);
    whiteBoxTest([..."Hello, world!"]);
  });

  it("defers text parsing when ambiguous", () => {
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

function tokenizeAll(chunks: string[]): Token[] {
  const tokenizer = new Tokenizer();
  const tokens: Token[] = [];
  for (const chunk of chunks) {
    tokenizer.addChunk(chunk, (token) => {
      tokens.push(token);
    }, () => {});
  }
  return tokens;
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
            expected.push(createRawEndTagToken(part));
          } else if (/^<[a-zA-Z]/.test(part)) {
            expected.push(createRawStartTagToken(part));
          } else {
            expected.push(createRawTextToken(part));
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
            if (token.type === "RawTextToken" && expected.length > 0 && expected[expected.length - 1].type === "RawTextToken") {
              const lastToken = expected.pop()! as RawTextToken;
              const newToken = createRawTextToken(lastToken.raw + token.raw);
              expect(textValue(lastToken) + textValue(token)).toBe(textValue(newToken));
              expected.push(newToken);
            } else {
              expected.push(token);
            }
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(chunk, (token) => {
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
