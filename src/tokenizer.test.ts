import { describe, expect, it } from "@jest/globals";
import { Token, createRawTextToken, createRawStartTagToken, createRawEndTagToken, textValue, createRawDoctypeToken, RawToken, createRawCommentToken, createGarbageToken } from "./token";
import { Tokenizer } from "./tokenizer";

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

    defineWhiteBoxTest(["\r%"]);
    defineWhiteBoxTest([delay("\r"), "<a>"]);
    defineWhiteBoxTest([delay("\r")]);
    defineWhiteBoxTest(["<%"]);
    defineWhiteBoxTest([delay("<"), "<a>"]);
    defineWhiteBoxTest([delay("<")]);
    defineWhiteBoxTest(["&amp%"]);
    defineWhiteBoxTest([delay("&amp"), "<a>"]);
    defineWhiteBoxTest([delay("&amp")]);
    defineWhiteBoxTest(["&am%"]);
    defineWhiteBoxTest([delay("&am"), "<a>"]);
    defineWhiteBoxTest([delay("&am")]);
    defineWhiteBoxTest(["&#38%"]);
    defineWhiteBoxTest([delay("&#38"), "<a>"]);
    defineWhiteBoxTest([delay("&#38")]);
    defineWhiteBoxTest(["&#x26%"]);
    defineWhiteBoxTest([delay("&#x26"), "<a>"]);
    defineWhiteBoxTest([delay("&#x26")]);
    defineWhiteBoxTest(["&#x%"]);
    defineWhiteBoxTest([delay("&#x"), "<a>"]);
    defineWhiteBoxTest([delay("&#x")]);
    defineWhiteBoxTest(["&#%"]);
    defineWhiteBoxTest([delay("&#"), "<a>"]);
    defineWhiteBoxTest([delay("&#")]);
    defineWhiteBoxTest(["&%"]);
    defineWhiteBoxTest([delay("&"), "<a>"]);
    defineWhiteBoxTest([delay("&")]);

    defineWhiteBoxTest(["&ampe", ..."rsand;"]);
    defineWhiteBoxTest(["&notin;"]);
    defineWhiteBoxTest(["&notit", ...";"]);
    defineWhiteBoxTest(["&notin "]);
    defineWhiteBoxTest(["&a "]);
    defineWhiteBoxTest(["&ac "]);
    defineWhiteBoxTest(["&ad"]);
  });

  describe("RCDATA parsing", () => {
    function rcdata(raw: string) {
      return createRawTextToken(raw, "RCDATA");
    }
    function rcdataList(raw: string) {
      return [...raw].map((c) => createRawTextToken(c, "RCDATA"));
    }
    defineWhiteBoxTest(["<title>", createRawTextToken("<l", "RCDATA"), ...rcdataList("i>"), rcdata("a"), "</title>"]);
    defineWhiteBoxTest(["<title>", createRawTextToken("</li>", "RCDATA"), rcdata("a"), "</title>"]);
    defineWhiteBoxTest(["<title>", createRawTextToken("</li-", "RCDATA"), ...rcdataList(">a"), "</title>"]);
    defineWhiteBoxTest(["<title>", createRawTextToken("</title-", "RCDATA"), ...rcdataList(">a"), "</title>"]);
    defineWhiteBoxTest(["<textarea>", createRawTextToken("<l", "RCDATA"), ...rcdataList("i>"), rcdata("a"), "</textarea>"]);
    defineWhiteBoxTest(["<textarea>", createRawTextToken("</li>", "RCDATA"), rcdata("a"), "</textarea>"]);

    defineWhiteBoxTest(["<title>", rcdata("&amp;"), "</title>"]);
    defineWhiteBoxTest(["<title>", rcdata("\r\n"), "</title>"]);
    defineWhiteBoxTest(["<title>", rcdata("\ra"), "</title>"]);
    defineWhiteBoxTest(["<title>", delay(rcdata("\r")), "</title>"]);
    defineWhiteBoxTest(["<title>", delay(rcdata("\r")), rcdata("<a"), rcdata(">"), "</title>"]);

    defineWhiteBoxTest(["<title>", "</title >", "<a>"]);
    defineWhiteBoxTest(["<title>", "</title foo=bar>", "<a>"]);
    defineWhiteBoxTest(["<title>", "</title/>", "<a>"]);

    defineWhiteBoxTest(["<title>", "</title>", "<a>"]);
    defineWhiteBoxTest(["<TITLE>", "</TITLE>", "<a>"]);
    defineWhiteBoxTest(["<Title>", "</Title>", "<a>"]);
    defineWhiteBoxTest(["<tiTle>", "</tiTle>", "<a>"]);
    defineWhiteBoxTest(["<TITLE>", "</title>", "<a>"]);
    defineWhiteBoxTest(["<title>", "</TITLE>", "<a>"]);
  });

  describe("RAWTEXT parsing", () => {
    function rawtext(raw: string) {
      return createRawTextToken(raw, "RAWTEXT");
    }
    function rawtextList(raw: string) {
      return [...raw].map((c) => createRawTextToken(c, "RAWTEXT"));
    }
    defineWhiteBoxTest(["<xmp>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", createRawTextToken("</li-", "RAWTEXT"), ...rawtextList(">a"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", createRawTextToken("</title-", "RAWTEXT"), ...rawtextList(">a"), "</xmp>"]);
    defineWhiteBoxTest(["<style>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</style>"]);
    defineWhiteBoxTest(["<style>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</style>"]);
    defineWhiteBoxTest(["<iframe>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</iframe>"]);
    defineWhiteBoxTest(["<iframe>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</iframe>"]);
    defineWhiteBoxTest(["<noframes>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</noframes>"]);
    defineWhiteBoxTest(["<noframes>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</noframes>"]);
    defineWhiteBoxTest(["<noembed>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</noembed>"]);
    defineWhiteBoxTest(["<noembed>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</noembed>"]);
    defineWhiteBoxTest(["<noscript>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</noscript>"], { scripting: true });
    defineWhiteBoxTest(["<noscript>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</noscript>"], { scripting: true });
    defineWhiteBoxTest(["<noscript>", "<li>", "a", "</noscript>"], { scripting: false });
    defineWhiteBoxTest(["<noscript>", "</li>", "a", "</noscript>"], { scripting: false });

    defineWhiteBoxTest(["<xmp>", ...rawtextList("&amp;"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", rawtext("\r\n"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", rawtext("\ra"), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("\r")), "</xmp>"]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("\r")), rawtext("<a"), rawtext(">"), "</xmp>"]);

    defineWhiteBoxTest(["<xmp>", "</xmp >", "<a>"]);
    defineWhiteBoxTest(["<xmp>", "</xmp foo=bar>", "<a>"]);
    defineWhiteBoxTest(["<xmp>", "</xmp/>", "<a>"]);

    defineWhiteBoxTest(["<xmp>", "</xmp>", "<a>"]);
    defineWhiteBoxTest(["<XMP>", "</XMP>", "<a>"]);
    defineWhiteBoxTest(["<Xmp>", "</Xmp>", "<a>"]);
    defineWhiteBoxTest(["<xMp>", "</xMp>", "<a>"]);
    defineWhiteBoxTest(["<XMP>", "</xmp>", "<a>"]);
    defineWhiteBoxTest(["<xmp>", "</XMP>", "<a>"]);
  });

  describe("script data parsing", () => {
    function rawtext(raw: string) {
      return createRawTextToken(raw, "RAWTEXT");
    }
    function rawtextList(raw: string) {
      return [...raw].map((c) => createRawTextToken(c, "RAWTEXT"));
    }
    defineWhiteBoxTest(["<script>", createRawTextToken("<l", "RAWTEXT"), ...rawtextList("i>"), rawtext("a"), "</script>"]);
    defineWhiteBoxTest(["<script>", createRawTextToken("</li>", "RAWTEXT"), rawtext("a"), "</script>"]);
    defineWhiteBoxTest(["<script>", createRawTextToken("</li-", "RAWTEXT"), ...rawtextList(">a"), "</script>"]);
    defineWhiteBoxTest(["<script>", createRawTextToken("</title-", "RAWTEXT"), ...rawtextList(">a"), "</script>"]);

    defineWhiteBoxTest(["<script>", rawtext("<s"), ...rawtextList("cript>"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></script>"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript </script>"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript/</script>"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></script/"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></script "), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cripta"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript-"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript#"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></scripta</script>")]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></script-</script>")]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript></script#</script>")]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("-"), rawtext("<s"), ...rawtextList("cript>"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), rawtext("<s"), ...rawtextList("cript>"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("-->"), rawtext("<s"), ...rawtextList("cript>"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--->"), rawtext("<s"), ...rawtextList("cript>"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("---->"), rawtext("<s"), ...rawtextList("cript>"), "</script>", "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("<!"), ...rawtextList("--"), rawtext("<s"), ...rawtextList("cript>-->"), "</script>"]);

    defineWhiteBoxTest(["<script>", ...rawtextList("&amp;"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("\r\n"), "</script>"]);
    defineWhiteBoxTest(["<script>", rawtext("\ra"), "</script>"]);
    defineWhiteBoxTest(["<script>", delay(rawtext("\r")), "</script>"]);
    defineWhiteBoxTest(["<script>", delay(rawtext("\r")), rawtext("<a"), rawtext(">"), "</script>"]);

    defineWhiteBoxTest(["<script>", "</script >", "<a>"]);
    defineWhiteBoxTest(["<script>", "</script foo=bar>", "<a>"]);
    defineWhiteBoxTest(["<script>", "</script/>", "<a>"]);

    defineWhiteBoxTest(["<script>", "</script>", "<a>"]);
    defineWhiteBoxTest(["<SCRIPT>", "</SCRIPT>", "<a>"]);
    defineWhiteBoxTest(["<Script>", "</Script>", "<a>"]);
    defineWhiteBoxTest(["<scRipt>", "</scRipt>", "<a>"]);
    defineWhiteBoxTest(["<SCRIPT>", "</script>", "<a>"]);
    defineWhiteBoxTest(["<script>", "</SCRIPT>", "<a>"]);
  });

  describe("PLAINTEXT parsing", () => {
    function rawtext(raw: string) {
      return createRawTextToken(raw, "RAWTEXT");
    }
    function rawtextList(raw: string) {
      return [...raw].map((c) => createRawTextToken(c, "RAWTEXT"));
    }
    defineWhiteBoxTest(["<plaintext>", ...rawtextList("foo")]);
    defineWhiteBoxTest(["<plaintext>", ...rawtextList("<a></a>")]);
    defineWhiteBoxTest(["<plaintext>", ...rawtextList("<li></li>")]);
    defineWhiteBoxTest(["<plaintext>", ...rawtextList("<plaintext></plaintext>")]);
    defineWhiteBoxTest(["<plaintext>", ...rawtextList("&amp;")]);
    defineWhiteBoxTest(["<plaintext>", rawtext("\r\n"), rawtext("x")]);
    defineWhiteBoxTest(["<plaintext>", rawtext("\ra"), rawtext("x")]);
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

  describe("non-tags", () => {
    defineWhiteBoxTest([createGarbageToken("</>")]);
  });

  describe("comments", () => {
    defineWhiteBoxTest(["<!--a-->", ..."-->"]);
    defineWhiteBoxTest(["<!---->", ..."-->"]);
    defineWhiteBoxTest(["<!--->", ..."-->"]);
    defineWhiteBoxTest(["<!-->", ..."-->"]);
    defineWhiteBoxTest([createRawCommentToken("<!->"), ..."-->"]);
    defineWhiteBoxTest([createRawCommentToken("<!>"), ..."-->"]);
    defineWhiteBoxTest(["<!--a--!>", ..."-->"]);
    defineWhiteBoxTest(["<!----!>", ..."-->"]);
    defineWhiteBoxTest(["<!---!>-->"]);
    defineWhiteBoxTest(["<!--!>-->"]);
    defineWhiteBoxTest([createRawCommentToken("<!-!>"), ..."-->"]);
    defineWhiteBoxTest([createRawCommentToken("<!!>"), ..."-->"]);

    defineWhiteBoxTest(["<!-- >-->", ..."-->"]);
    defineWhiteBoxTest(["<!-- ->-->", ..."-->"]);
    defineWhiteBoxTest(["<!-- --->", ..."-->"]);
    defineWhiteBoxTest(["<!-- ---->", ..."-->"]);
  });

  describe("bogus comments", () => {
    defineWhiteBoxTest([createRawCommentToken("<!>"), "b"]);
    defineWhiteBoxTest([createRawCommentToken("<!a>"), "b"]);
    defineWhiteBoxTest([createRawCommentToken("<?>"), "b"]);
    defineWhiteBoxTest([createRawCommentToken("<?a>"), "b"]);
    defineWhiteBoxTest([createRawCommentToken("</%>"), "b"]);
    defineWhiteBoxTest([createRawCommentToken("</#a>"), "b"]);
  });

  describe("doctypes", () => {
    defineWhiteBoxTest(["<!doctype html>"]);
  });

  describe("texts ending with ambiguous parts", () => {
    defineWhiteBoxTest(["a", delay("\r")]);
    defineWhiteBoxTest(["a", delay("&amp")]);
    defineWhiteBoxTest(["a", delay("&am")]);
    defineWhiteBoxTest(["a", delay("&")]);
  });

  describe("incomplete tags and texts in RCDATA", () => {
    function rcdata(raw: string) {
      return createRawTextToken(raw, "RCDATA");
    }
    defineWhiteBoxTest(["<title>", delay(createGarbageToken("</title "))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("</title"))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("</titl"))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("</div"))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("</"))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("<"))]);
    defineWhiteBoxTest(["<textarea>", delay(rcdata("</textarea"))]);
    defineWhiteBoxTest(["<textarea>", delay(rcdata("</textare"))]);
    defineWhiteBoxTest(["<textarea>", delay(rcdata("</div"))]);
    defineWhiteBoxTest(["<textarea>", delay(rcdata("</"))]);
    defineWhiteBoxTest(["<textarea>", delay(rcdata("<"))]);

    defineWhiteBoxTest(["<title>", delay(rcdata("&am"))]);
    defineWhiteBoxTest(["<title>", delay(rcdata("\r"))]);
  });

  describe("incomplete tags and texts in RAWTEXT", () => {
    function rawtext(raw: string) {
      return createRawTextToken(raw, "RAWTEXT");
    }
    defineWhiteBoxTest(["<xmp>", delay(createGarbageToken("</xmp "))]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("</xmp"))]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("</xm"))]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("</div"))]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("</"))]);
    defineWhiteBoxTest(["<xmp>", delay(rawtext("<"))]);
    defineWhiteBoxTest(["<style>", delay(rawtext("</style"))]);
    defineWhiteBoxTest(["<style>", delay(rawtext("</styl"))]);
    defineWhiteBoxTest(["<style>", delay(rawtext("</div"))]);
    defineWhiteBoxTest(["<style>", delay(rawtext("</"))]);
    defineWhiteBoxTest(["<style>", delay(rawtext("<"))]);

    defineWhiteBoxTest(["<xmp>", delay(rawtext("\r"))]);
  });

  describe("incomplete texts in PLAINTEXT", () => {
    function rawtext(raw: string) {
      return createRawTextToken(raw, "RAWTEXT");
    }
    defineWhiteBoxTest(["<plaintext>", delay(rawtext("\r"))]);
  });

  describe("short incomplete tags", () => {
    defineWhiteBoxTest([delay("<")]);
    defineWhiteBoxTest([delay(createRawTextToken("</"))]);
  });

  describe("long incomplete tags", () => {
    defineWhiteBoxTest([delay(createGarbageToken("<a"))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a "))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a a"))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a a="))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a a=\""))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a a='"))]);
    defineWhiteBoxTest([delay(createGarbageToken("<a a=a"))]);
    defineWhiteBoxTest([delay(createGarbageToken("</a"))]);
  });

  describe("incomplete doctypes", () => {
    defineWhiteBoxTest([delay(createRawDoctypeToken("<!doctype html"))]);
  });

  describe("incomplete comments", () => {
    defineWhiteBoxTest([delay(createRawCommentToken("<!-- c"))]);
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

type DelayedToken = { type: "Delayed", token: RawToken };

function delay(part: string | RawToken): DelayedToken {
  return { type: "Delayed", token: typeof part === "string" ? createRawTextToken(part) : part };
}

function getRaw(part: string | RawToken | DelayedToken): string {
  return typeof part === "string" ? part : part.type === "Delayed" ? getRaw(part.token) : part.raw;
}

function defineWhiteBoxTest(parts: (string | RawToken | DelayedToken)[], options: { scripting?: boolean, skip?: boolean, only?: boolean } = {}) {
  const { scripting = false, skip, only } = options;
  let additional = "";
  if (scripting) additional += " with scripting";
  const text = parts.map(getRaw).join("");
  const itHere = only ? it.only : skip ? it.skip : it;
  itHere(`parses ${JSON.stringify(text)}${additional}`, () => {
    whiteBoxTest(parts, options);
  });
}

function whiteBoxTest(parts: (string | RawToken | DelayedToken)[], options: { scripting?: boolean } = {}) {
  const text = parts.map(getRaw).join("");
  const states: Tokenizer[] = [];
  const outputs: Token[][] = [];

  // Check one-step results
  {
    const tokenizer = new Tokenizer();
    if (options.scripting) tokenizer.scripting = true;
    states.push(tokenizer.clone());
    const expectedAll: Token[][] = [];
    const resultAll: Token[][] = [];
    let nextExpected: Token[] = [];
    for (const part of parts) {
      const partText = getRaw(part);
      for (let i = 0; i < partText.length; i++) {
        const expected: Token[] = nextExpected;
        nextExpected = [];
        if (i + 1 === partText.length) {
          if (typeof part !== "string") {
            if (part.type === "Delayed") {
              nextExpected.push(part.token);
            } else {
              expected.push(part);
            }
          } else if (part.startsWith("</")) {
            expected.push(createRawEndTagToken(part));
          } else if (/^<[a-zA-Z]/.test(part)) {
            expected.push(createRawStartTagToken(part));
          } else if (/^<!DOCTYPE/i.test(part)) {
            expected.push(createRawDoctypeToken(part));
          } else if (part.startsWith("<!--")) {
            expected.push(createRawCommentToken(part));
          } else {
            expected.push(createRawTextToken(part));
          }
        }
        const result: Token[] = [];
        tokenizer.addChunk(partText[i], (token) => {
          result.push(token);
        });
        expectedAll.push(expected);
        resultAll.push(result);
        states.push(tokenizer.clone());
        outputs.push(result);
      }
    }
    {
      const expected: Token[] = nextExpected;
      const result: Token[] = [];
      tokenizer.finish((token) => {
        result.push(token);
      });
      expectedAll.push(expected);
      resultAll.push(result);
      states.push(tokenizer.clone());
      outputs.push(result);
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
  if (tokenToAdd.type === "RawTextToken" && tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];
    if (lastToken.type === "RawTextToken" && lastToken.kind === tokenToAdd.kind) {
      const newToken = createRawTextToken(lastToken.raw + tokenToAdd.raw, lastToken.kind);
      expect(textValue(lastToken) + textValue(tokenToAdd)).toEqual(textValue(newToken));
      tokens.pop();
      tokens.push(newToken);
    } else {
      tokens.push(tokenToAdd);
    }
  } else {
    tokens.push(tokenToAdd);
  }
}
