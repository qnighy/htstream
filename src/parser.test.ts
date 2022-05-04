import { describe, expect, it } from "@jest/globals";
import { TokenParser } from "./parser";
import { createEndTagToken, createRawDoctypeToken, createRawTextToken, createStartTagToken, Token } from "./token";

describe("TokenParser", () => {
  it("parses simple documents", () => {
    const result: Token[] = [];
    const addToken = (token: Token) => result.push(token);
    const parser = new TokenParser();
    parser.addToken(createRawDoctypeToken("<!DOCTYPE html>"), addToken);
    parser.addToken(createRawTextToken("\n"), addToken);
    parser.addToken(createStartTagToken("<html>"), addToken);
    parser.addToken(createRawTextToken("\n  "), addToken);
    parser.addToken(createStartTagToken("<body>"), addToken);
    parser.addToken(createRawTextToken("\n    "), addToken);
    parser.addToken(createStartTagToken("<h1>"), addToken);
    parser.addToken(createRawTextToken("Hello!"), addToken);
    parser.addToken(createEndTagToken("</h1>"), addToken);
    parser.addToken(createRawTextToken("\n  "), addToken);
    parser.addToken(createEndTagToken("</body>"), addToken);
    parser.addToken(createRawTextToken("\n"), addToken);
    parser.addToken(createEndTagToken("</html>"), addToken);
    parser.addToken(createRawTextToken("\n"), addToken);
    parser.finish(addToken);
    expect(result).toEqual([
      createRawDoctypeToken("<!DOCTYPE html>"),
      createRawTextToken("\n"),
      createStartTagToken("<html>"),
      createRawTextToken("\n  "),
      createStartTagToken("<body>"),
      createRawTextToken("\n    "),
      createStartTagToken("<h1>"),
      createRawTextToken("Hello!"),
      createEndTagToken("</h1>"),
      createRawTextToken("\n  "),
      createEndTagToken("</body>"),
      createRawTextToken("\n"),
      createEndTagToken("</html>"),
      createRawTextToken("\n"),
    ]);
  });
});
