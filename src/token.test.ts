import { describe, expect, it, xit } from "@jest/globals";
import { normalizeTagName, createRawStartTagToken, textValue, createRawTextToken, createTextToken, createStartTagToken, createEndTagToken, createRawEndTagToken, parseToken, createRawDoctypeToken, createRawCommentToken, commentValue, createCommentToken } from "./token";

describe("createStartTagToken", () => {
  it("normalizes the tag name", () => {
    expect(createStartTagToken("FOO").tagName).toBe("foo");
    expect(createStartTagToken("F\xD2\xD3").tagName).toBe("f\xD2\xD3");
    expect(createStartTagToken("F\0O").tagName).toBe("f\uFFFDo");
  });
});

describe("createRawStartTagToken", () => {
  it("extracts the tag name", () => {
    expect(createRawStartTagToken("<foo>").tagName).toBe("foo");
    expect(createRawStartTagToken("<foo-bar baz=baz>").tagName).toBe("foo-bar");
    expect(createRawStartTagToken("<foo-bar/>").tagName).toBe("foo-bar");
  });

  it("normalizes the extracted tag name", () => {
    expect(createRawStartTagToken("<FOO>").tagName).toBe("foo");
    expect(createRawStartTagToken("<F\xD2\xD3>").tagName).toBe("f\xD2\xD3");
    expect(createRawStartTagToken("<F\0O>").tagName).toBe("f\uFFFDo");
  });
});

describe("createEndTagToken", () => {
  it("normalizes the tag name", () => {
    expect(createEndTagToken("FOO").tagName).toBe("foo");
    expect(createEndTagToken("F\xD2\xD3").tagName).toBe("f\xD2\xD3");
    expect(createEndTagToken("F\0O").tagName).toBe("f\uFFFDo");
  });
});

describe("createRawEndTagToken", () => {
  it("extracts the tag name", () => {
    expect(createRawEndTagToken("</foo>").tagName).toBe("foo");
    expect(createRawEndTagToken("</foo-bar baz=baz>").tagName).toBe("foo-bar");
    expect(createRawEndTagToken("</foo-bar/>").tagName).toBe("foo-bar");
  });

  it("normalizes the extracted tag name", () => {
    expect(createRawEndTagToken("</FOO>").tagName).toBe("foo");
    expect(createRawEndTagToken("</F\xD2\xD3>").tagName).toBe("f\xD2\xD3");
    expect(createRawEndTagToken("</F\0O>").tagName).toBe("f\uFFFDo");
  });
});

describe("parseToken", () => {
  it("parses text tokens", () => {
    expect(parseToken(createRawTextToken("foo")).type).toBe("TextToken");
    expect(parseToken(createRawTextToken("foo")).value).toBe("foo");
    expect(parseToken(createRawTextToken("a < b")).value).toBe("a < b");
    expect(parseToken(createRawTextToken("a &lt; b")).value).toBe("a < b");
  });

  it("parses start tag tokens", () => {
    expect(parseToken(createRawStartTagToken("<foo>")).type).toBe("StartTagToken");
    expect(parseToken(createRawStartTagToken("<foo>")).tagName).toBe("foo");
    expect(parseToken(createRawStartTagToken("<foo-bar baz=baz>")).tagName).toBe("foo-bar");
    expect(parseToken(createRawStartTagToken("<foo-bar/>")).tagName).toBe("foo-bar");
  });

  it("parses end tag tokens", () => {
    expect(parseToken(createRawEndTagToken("</foo>")).type).toBe("EndTagToken");
    expect(parseToken(createRawEndTagToken("</foo>")).tagName).toBe("foo");
    expect(parseToken(createRawEndTagToken("</foo-bar baz=baz>")).tagName).toBe("foo-bar");
    expect(parseToken(createRawEndTagToken("</foo-bar/>")).tagName).toBe("foo-bar");
  });

  it("parses doctype tokens", () => {
    expect(parseToken(createRawDoctypeToken("<!doctype html>")).type).toBe("DoctypeToken");
  });

  xit("parses comment tokens", () => {
    expect(parseToken(createRawCommentToken("<!-- -->")).type).toBe("CommentToken");
  });
});

describe("textValue", () => {
  describe("for TextToken", () => {
    it("returns the value as-is", () => {
      expect(textValue(createTextToken("Hello, world!"))).toBe("Hello, world!");
      expect(textValue(createTextToken("a < b"))).toBe("a < b");
      expect(textValue(createTextToken("<a>&amp;</a>"))).toBe("<a>&amp;</a>");
    });
  });

  describe("for RawTextToken", () => {
    it("returns the parsed value (general case)", () => {
      expect(textValue(createRawTextToken("Hello, world!"))).toBe("Hello, world!");
    });

    it("doesn't substitute stray <s", () => {
      expect(textValue(createRawTextToken("a < b"))).toBe("a < b");
    });

    it("doesn't substitute invalid &s", () => {
      expect(textValue(createRawTextToken("a &"))).toBe("a &");
      expect(textValue(createRawTextToken("a & b"))).toBe("a & b");
      expect(textValue(createRawTextToken("foo&bar;"))).toBe("foo&bar;");
      expect(textValue(createRawTextToken("<&>"))).toBe("<&>");
      expect(textValue(createRawTextToken("<&#>"))).toBe("<&#>");
      expect(textValue(createRawTextToken("<&;>"))).toBe("<&;>");
      expect(textValue(createRawTextToken("<&#x>"))).toBe("<&#x>");
      expect(textValue(createRawTextToken("<&#z>"))).toBe("<&#z>");
    });

    it("substitutes character references", () => {
      expect(textValue(createRawTextToken("a &amp; b"))).toBe("a & b");
      expect(textValue(createRawTextToken("a&ampb"))).toBe("a&b");
      expect(textValue(createRawTextToken("a &notin; b"))).toBe("a \u2209 b");
      expect(textValue(createRawTextToken("a &notit; b"))).toBe("a \u00ACit; b");
      expect(textValue(createRawTextToken("a &#38; b"))).toBe("a & b");
      expect(textValue(createRawTextToken("a &#38 b"))).toBe("a & b");
      expect(textValue(createRawTextToken("a&#38b"))).toBe("a&b");
    });

    it("substitutes CR and CRLF", () => {
      expect(textValue(createRawTextToken("a\r\n"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\r"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\n\n\nb\n\n\rc\n\r\nd\n\r\re\r\n\nf\r\n\rg\r\r\nh\r\r\ri"))).toBe("a\n\n\nb\n\n\nc\n\nd\n\n\ne\n\nf\n\ng\n\nh\n\n\ni");
    });
  });
});

describe("commentValue", () => {
  describe("for CommentToken", () => {
    function testCase(input: string, expected: string) {
      it(`parses ${JSON.stringify(input)}`, () => {
        expect(commentValue(createCommentToken(input))).toBe(expected);
      });
    }
    describe("roundtrip", () => {
      testCase("Hello, world!", "Hello, world!");
      testCase("a < b", "a < b");
      testCase("<a>&amp;</a>", "<a>&amp;</a>");
    });
  });

  describe("for RawCommentToken", () => {
    function testCase(input: string, expected: string) {
      it(`parses ${JSON.stringify(input)}`, () => {
        expect(commentValue(createRawCommentToken(input))).toBe(expected);
      });
    }
    describe("correct comments", () => {
      testCase("<!---->", "");
      testCase("<!--a-->", "a");
      testCase("<!-- foo -->", " foo ");
      testCase("<!-- <a> -->", " <a> ");
      testCase("<!-- ---- -->", " ---- ");
      testCase("<!----->", "-");
      testCase("<!------>", "--");
      testCase("<!------->", "---");
      testCase("<!---a-->", "-a");
      testCase("<!----a-->", "--a");
      testCase("<!--a--->", "a-");
      testCase("<!---a--->", "-a-");
      testCase("<!----a--->", "--a-");
      testCase("<!--a---->", "a--");
      testCase("<!---a---->", "-a--");
      testCase("<!----a---->", "--a--");
      testCase("<!--<!-->", "<!");
      testCase("<!--a<!-->", "a<!");
      testCase("<!--!>-->", "!>");
      testCase("<!---!>-->", "-!>");
    });

    describe("comments with invalid contents", () => {
      testCase("<!--<!---->", "<!--");
      testCase("<!-- <!-- -->", " <!-- ");
      testCase("<!--<!--->", "<!-");
    });

    describe("abruptly closed comments", () => {
      testCase("<!-->", "");
      testCase("<!--->", "");
    });

    describe("incorrectly closed comments", () => {
      testCase("<!----!>", "");
      testCase("<!--a--!>", "a");
      testCase("<!-- foo --!>", " foo ");
      testCase("<!-- <a> --!>", " <a> ");
      testCase("<!-- ---- --!>", " ---- ");
      testCase("<!-----!>", "-");
      testCase("<!------!>", "--");
      testCase("<!-------!>", "---");
      testCase("<!---a--!>", "-a");
      testCase("<!----a--!>", "--a");
      testCase("<!--a---!>", "a-");
      testCase("<!---a---!>", "-a-");
      testCase("<!----a---!>", "--a-");
      testCase("<!--a----!>", "a--");
      testCase("<!---a----!>", "-a--");
      testCase("<!----a----!>", "--a--");
      testCase("<!--<!--!>", "<!");
      testCase("<!--a<!--!>", "a<!");
      testCase("<!--!>--!>", "!>");
      testCase("<!---!>--!>", "-!>");
    });

    describe("correctly closable partial comments", () => {
      testCase("<!----", "");
      testCase("<!--a--", "a");
      testCase("<!-- foo --", " foo ");
      testCase("<!-- <a> --", " <a> ");
      testCase("<!-- ---- --", " ---- ");
      testCase("<!-----", "-");
      testCase("<!------", "--");
      testCase("<!-------", "---");
      testCase("<!---a--", "-a");
      testCase("<!----a--", "--a");
      testCase("<!--a---", "a-");
      testCase("<!---a---", "-a-");
      testCase("<!----a---", "--a-");
      testCase("<!--a----", "a--");
      testCase("<!---a----", "-a--");
      testCase("<!----a----", "--a--");
      testCase("<!--<!--", "<!");
      testCase("<!--a<!--", "a<!");
      testCase("<!--!>--", "!>");
      testCase("<!---!>--", "-!>");

      testCase("<!---", "");
      testCase("<!--a-", "a");
      testCase("<!-- foo -", " foo ");
      testCase("<!-- <a> -", " <a> ");
      testCase("<!-- ---- -", " ---- ");
      // testCase("<!----", "");
      // testCase("<!-----", "-");
      // testCase("<!------", "--");
      testCase("<!---a-", "-a");
      testCase("<!----a-", "--a");
      // testCase("<!--a--", "a");
      // testCase("<!---a--", "-a");
      // testCase("<!----a--", "--a");
      // testCase("<!--a---", "a-");
      // testCase("<!---a---", "-a-");
      // testCase("<!----a---", "--a-");
      testCase("<!--<!-", "<!");
      testCase("<!--a<!-", "a<!");
      testCase("<!--!>-", "!>");
      testCase("<!---!>-", "-!>");

      testCase("<!--", "");
      testCase("<!--a", "a");
      testCase("<!-- foo ", " foo ");
      testCase("<!-- <a> ", " <a> ");
      testCase("<!-- ---- ", " ---- ");
      // testCase("<!---", "");
      // testCase("<!----", "");
      // testCase("<!-----", "-");
      testCase("<!---a", "-a");
      testCase("<!----a", "--a");
      // testCase("<!--a-", "a");
      // testCase("<!---a-", "-a");
      // testCase("<!----a-", "--a");
      // testCase("<!--a--", "a");
      // testCase("<!---a--", "-a");
      // testCase("<!----a--", "--a");
      testCase("<!--<!", "<!");
      testCase("<!--a<!", "a<!");
      testCase("<!--!>", "!>");
      testCase("<!---!>", "-!>");
    });

    describe("partial comments with invalid contents", () => {
      testCase("<!--<!----", "<!--");
      testCase("<!-- <!-- --", " <!-- ");
      testCase("<!--<!---", "<!-");

      // testCase("<!--<!---", "<!-");
      testCase("<!-- <!-- -", " <!-- ");
      // testCase("<!--<!--", "<!");

      // testCase("<!--<!--", "<!");
      testCase("<!-- <!-- ", " <!-- ");
      // testCase("<!--<!-", "<!");
    });

    describe("incorrectly closable partial comments", () => {
      testCase("<!----!", "");
      testCase("<!--a--!", "a");
      testCase("<!-- foo --!", " foo ");
      testCase("<!-- <a> --!", " <a> ");
      testCase("<!-- ---- --!", " ---- ");
      testCase("<!-----!", "-");
      testCase("<!------!", "--");
      testCase("<!-------!", "---");
      testCase("<!---a--!", "-a");
      testCase("<!----a--!", "--a");
      testCase("<!--a---!", "a-");
      testCase("<!---a---!", "-a-");
      testCase("<!----a---!", "--a-");
      testCase("<!--a----!", "a--");
      testCase("<!---a----!", "-a--");
      testCase("<!----a----!", "--a--");
      testCase("<!--<!--!", "<!");
      testCase("<!--a<!--!", "a<!");
      testCase("<!--!>--!", "!>");
      testCase("<!---!>--!", "-!>");
    });

    describe("bogus comments", () => {
      // NOTE: </> is not a bogus comment
      testCase("<!>", "");
      testCase("<?>", "?");
      testCase("</%>", "%");
      testCase("<!a>", "a");
      testCase("<?a>", "?a");
      testCase("</$a>", "$a");
      testCase("<!ENTITY a>", "ENTITY a");
      testCase("<![CDATA[a]]>", "[CDATA[a]]");
      testCase("<?xml version=\"1.0\"?>", "?xml version=\"1.0\"?");
    });

    describe("partial bogus comments", () => {
      // NOTE: </> is not a bogus comment
      testCase("<!", "");
      testCase("<?", "?");
      testCase("</%", "%");
      testCase("<!a", "a");
      testCase("<?a", "?a");
      testCase("</$a", "$a");
      testCase("<!ENTITY a", "ENTITY a");
      testCase("<![CDATA[a]]", "[CDATA[a]]");
      testCase("<?xml version=\"1.0\"?", "?xml version=\"1.0\"?");
    });
  });
});

describe("normalizeTagName", () => {
  it("converts ASCII uppercase letters to lower case", () => {
    expect(normalizeTagName("abc0123def")).toBe("abc0123def");
    expect(normalizeTagName("ABC0123DEF")).toBe("abc0123def");
    expect(normalizeTagName("Abc0123Def")).toBe("abc0123def");
  });

  it("avoid lowercasing of non-ASCII characters", () => {
    expect(normalizeTagName("A\xC0\xC1\xC2\xC3\xC4\xC5")).toBe("a\xC0\xC1\xC2\xC3\xC4\xC5");
  });

  it("converts null to the replacement character", () => {
    expect(normalizeTagName("abc\0def")).toBe("abc\uFFFDdef");
  });
});
