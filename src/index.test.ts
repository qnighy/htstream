import { describe, expect, it } from "@jest/globals";
import { Token, createRawTextToken, createRawStartTagToken, createRawEndTagToken, textValue, RawTextToken, createRawDoctypeToken, RawToken, createRawCommentToken } from "./token";
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
    whiteBoxTest(["A", "&#38;", "B"]);
    whiteBoxTest(["A", "&#x26;", "B"]);
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
    whiteBoxTest(["<a a=c d>", ...">"]);
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

  it("parses doctype", () => {
    whiteBoxTest(["<!doctype html>"]);
  });

  it("parses texts ending with ambiguous parts", () => {
    whiteBoxTest(["a", "\r"]);
    whiteBoxTest(["a", "&amp"]);
    whiteBoxTest(["a", "&am"]);
    whiteBoxTest(["a", "&"]);
  });

  it("parses short incomplete tags as texts", () => {
    whiteBoxTest(["<"]);
    whiteBoxTest([createRawTextToken("</")]);
  });

  it("parses incomplete tags as comments", () => {
    whiteBoxTest([createRawCommentToken("<a")]);
    whiteBoxTest([createRawCommentToken("<a ")]);
    whiteBoxTest([createRawCommentToken("<a a")]);
    whiteBoxTest([createRawCommentToken("<a a=")]);
    whiteBoxTest([createRawCommentToken("<a a=\"")]);
    whiteBoxTest([createRawCommentToken("<a a='")]);
    whiteBoxTest([createRawCommentToken("<a a=a")]);
    whiteBoxTest([createRawCommentToken("</a")]);
  });

  it("parses incomplete doctypes", () => {
    whiteBoxTest([createRawDoctypeToken("<!doctype html")]);
  });

  it("parses incomplete comments", () => {
    whiteBoxTest([createRawCommentToken("<!-- c")]);
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
