import { describe, expect, it } from "@jest/globals";
import { Token, createRawTextToken, createRawStartTagToken, createRawEndTagToken, textValue, RawTextToken, createRawDoctypeToken, RawToken, createRawCommentToken, createGarbageToken } from "./token";
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
  describe("char-by-char text parsing", () => {
    defineWhiteBoxTest([]);
    defineWhiteBoxTest([..."Hello, world!"]);
  });

  describe("text parsing when ambiguous", () => {
    defineWhiteBoxTest([..."Hello,", "\r\n", ..."world!"]);
    defineWhiteBoxTest([..."John ", "&amp;", ..." Mary"]);
    defineWhiteBoxTest([..."Here we have foo ", "< ", ..."bar"]);
    defineWhiteBoxTest(["A", "&#38;", "B"]);
    defineWhiteBoxTest(["A", "&#x26;", "B"]);
  });

  describe("tags", () => {
    defineWhiteBoxTest(["<a>", ..."Hi", "</a>"]);
    defineWhiteBoxTest(["<div>", "</div>"]);
    defineWhiteBoxTest(["<br/>"]);
    defineWhiteBoxTest(["<br >"]);
    defineWhiteBoxTest(["<a/b>"]);
    defineWhiteBoxTest([..."a", "<a>", ..."b", "</a>", ..."c"]);
    defineWhiteBoxTest(["<a ab=cd>"]);
    defineWhiteBoxTest(["<a a=c>", ...">"]);
    defineWhiteBoxTest(["<a a=c d>", ...">"]);
    defineWhiteBoxTest(["<a a=\"c\">", ...">"]);
    defineWhiteBoxTest(["<a a=\"c>\" >", ...">"]);
    defineWhiteBoxTest(["<a a='c'>", ...">"]);
    defineWhiteBoxTest(["<a a='c>'>", ...""]);
    defineWhiteBoxTest(["<a a>", ..."=c>"]);
    defineWhiteBoxTest(["<a ==>", ...">"]);
    defineWhiteBoxTest(["<a =>", ...">"]);
    defineWhiteBoxTest(["<a ==\">\">", ...""]);
    defineWhiteBoxTest(["<a =\">", ..."\">"]);
    defineWhiteBoxTest(["<a =='>'>", ...""]);
    defineWhiteBoxTest(["<a ='>", ..."'>"]);
    defineWhiteBoxTest(["<a a b=c>"]);
    defineWhiteBoxTest(["<a a/b=c>"]);
    defineWhiteBoxTest(["<a a/b=>"]);
    defineWhiteBoxTest(["<a a/b>"]);
    defineWhiteBoxTest(["<a a=\">\">"]);
    defineWhiteBoxTest(["<a a= \">\">"]);
    defineWhiteBoxTest(["<a a =\">\">"]);
    defineWhiteBoxTest(["<a a/=\">", ..."\">"]);
  });

  describe("doctypes", () => {
    defineWhiteBoxTest(["<!doctype html>"]);
  });

  describe("texts ending with ambiguous parts", () => {
    defineWhiteBoxTest(["a", "\r"]);
    defineWhiteBoxTest(["a", "&amp"]);
    defineWhiteBoxTest(["a", "&am"]);
    defineWhiteBoxTest(["a", "&"]);
  });

  describe("short incomplete tags", () => {
    defineWhiteBoxTest(["<"]);
    defineWhiteBoxTest([createRawTextToken("</")]);
  });

  describe("long incomplete tags", () => {
    defineWhiteBoxTest([createGarbageToken("<a")]);
    defineWhiteBoxTest([createGarbageToken("<a ")]);
    defineWhiteBoxTest([createGarbageToken("<a a")]);
    defineWhiteBoxTest([createGarbageToken("<a a=")]);
    defineWhiteBoxTest([createGarbageToken("<a a=\"")]);
    defineWhiteBoxTest([createGarbageToken("<a a='")]);
    defineWhiteBoxTest([createGarbageToken("<a a=a")]);
    defineWhiteBoxTest([createGarbageToken("</a")]);
  });

  describe("incomplete doctypes", () => {
    defineWhiteBoxTest([createRawDoctypeToken("<!doctype html")]);
  });

  describe("incomplete comments", () => {
    defineWhiteBoxTest([createRawCommentToken("<!-- c")]);
  });
});

function tokenizeAll(chunks: string[]): Token[] {
  const tokenizer = new Tokenizer();
  const tokens: Token[] = [];
  for (const chunk of chunks) {
    tokenizer.addChunk(chunk, (token) => {
      tokens.push(token);
    });
  }
  return tokens;
}

function defineWhiteBoxTest(parts: (string | RawToken)[]) {
  const text = parts.map((part) => typeof part === "string" ? part : part.raw).join("");
  it(`parses ${JSON.stringify(text)}`, () => {
    whiteBoxTest(parts);
  });
}

function whiteBoxTest(parts: (string | RawToken)[]) {
  const text = parts.map((part) => typeof part === "string" ? part : part.raw).join("");
  const states: Tokenizer[] = [];
  const outputs: Token[][] = [];

  // Check one-step results
  {
    const tokenizer = new Tokenizer();
    states.push(tokenizer);
    const expectedAll: Token[][] = [];
    const resultAll: Token[][] = [];
    for (const part of parts) {
      const partText = typeof part === "string" ? part : part.raw;
      for (let i = 0; i < partText.length; i++) {
        const expected: Token[] = [];
        if (i + 1 === partText.length) {
          if (typeof part !== "string") {
            expected.push(part);
          } else if (part.startsWith("</")) {
            expected.push(createRawEndTagToken(part));
          } else if (/^<[a-zA-Z]/.test(part)) {
            expected.push(createRawStartTagToken(part));
          } else if (/^<!DOCTYPE/i.test(part)) {
            expected.push(createRawDoctypeToken(part));
          } else {
            expected.push(createRawTextToken(part));
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(partText[i], (token) => {
          result.push(token);
        });
        if (resultAll.length + 1 === text.length) {
          tokenizer.finish((token) => {
            result.push(token);
          });
        }
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
            pushTokenAmalgamate(expected, token);
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(chunk, (token) => {
          pushTokenAmalgamate(result, token);
        });
        if (j === text.length) {
          tokenizer.finish((token) => {
            pushTokenAmalgamate(result, token);
          });
        }
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

function pushTokenAmalgamate(tokens: Token[], tokenToAdd: Token) {
  if (tokenToAdd.type === "RawTextToken" && tokens.length > 0 && tokens[tokens.length - 1].type === "RawTextToken") {
    const lastToken = tokens[tokens.length - 1] as RawTextToken;
    const newToken = createRawTextToken(lastToken.raw + tokenToAdd.raw);
    tokens.pop();
    tokens.push(newToken);
  } else {
    tokens.push(tokenToAdd);
  }
}
