import { describe, expect, it, xit } from "@jest/globals";
import { normalizeTagName, createRawStartTagToken, textValue, createRawTextToken, createTextToken, createStartTagToken, createEndTagToken, createRawEndTagToken, parseToken, createRawDoctypeToken, createRawCommentToken, commentValue, createCommentToken, splitWhitespace } from "./token";

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

  describe("for RawTextToken (data)", () => {
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

    it("removes NUL", () => {
      expect(textValue(createRawTextToken("a\0b"))).toBe("ab");
    });
  });

  describe("for RawTextToken (RCDATA)", () => {
    it("returns the parsed value (general case)", () => {
      expect(textValue(createRawTextToken("Hello, world!", "RCDATA"))).toBe("Hello, world!");
    });

    it("doesn't substitute stray <s", () => {
      expect(textValue(createRawTextToken("a < b", "RCDATA"))).toBe("a < b");
    });

    it("doesn't substitute invalid &s", () => {
      expect(textValue(createRawTextToken("a &", "RCDATA"))).toBe("a &");
      expect(textValue(createRawTextToken("a & b", "RCDATA"))).toBe("a & b");
      expect(textValue(createRawTextToken("foo&bar;", "RCDATA"))).toBe("foo&bar;");
      expect(textValue(createRawTextToken("<&>", "RCDATA"))).toBe("<&>");
      expect(textValue(createRawTextToken("<&#>", "RCDATA"))).toBe("<&#>");
      expect(textValue(createRawTextToken("<&;>", "RCDATA"))).toBe("<&;>");
      expect(textValue(createRawTextToken("<&#x>", "RCDATA"))).toBe("<&#x>");
      expect(textValue(createRawTextToken("<&#z>", "RCDATA"))).toBe("<&#z>");
    });

    it("substitutes character references", () => {
      expect(textValue(createRawTextToken("a &amp; b", "RCDATA"))).toBe("a & b");
      expect(textValue(createRawTextToken("a&ampb", "RCDATA"))).toBe("a&b");
      expect(textValue(createRawTextToken("a &notin; b", "RCDATA"))).toBe("a \u2209 b");
      expect(textValue(createRawTextToken("a &notit; b", "RCDATA"))).toBe("a \u00ACit; b");
      expect(textValue(createRawTextToken("a &#38; b", "RCDATA"))).toBe("a & b");
      expect(textValue(createRawTextToken("a &#38 b", "RCDATA"))).toBe("a & b");
      expect(textValue(createRawTextToken("a&#38b", "RCDATA"))).toBe("a&b");
    });

    it("substitutes CR and CRLF", () => {
      expect(textValue(createRawTextToken("a\r\n", "RCDATA"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\r", "RCDATA"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\n\n\nb\n\n\rc\n\r\nd\n\r\re\r\n\nf\r\n\rg\r\r\nh\r\r\ri", "RCDATA"))).toBe("a\n\n\nb\n\n\nc\n\nd\n\n\ne\n\nf\n\ng\n\nh\n\n\ni");
    });

    it("substitutes NUL", () => {
      expect(textValue(createRawTextToken("a\0b", "RCDATA"))).toBe("a\uFFFDb");
    });

    it("leaves tag-likes as is", () => {
      expect(textValue(createRawTextToken("<a>", "RCDATA"))).toBe("<a>");
      expect(textValue(createRawTextToken("<title></title>", "RCDATA"))).toBe("<title></title>");
    });
  });

  describe("for RawTextToken (RAWTEXT)", () => {
    it("returns the parsed value (general case)", () => {
      expect(textValue(createRawTextToken("Hello, world!", "RAWTEXT"))).toBe("Hello, world!");
    });

    it("doesn't substitute stray <s", () => {
      expect(textValue(createRawTextToken("a < b", "RAWTEXT"))).toBe("a < b");
    });

    it("doesn't substitute character references", () => {
      expect(textValue(createRawTextToken("a &", "RAWTEXT"))).toBe("a &");
      expect(textValue(createRawTextToken("a & b", "RAWTEXT"))).toBe("a & b");
      expect(textValue(createRawTextToken("foo&bar;", "RAWTEXT"))).toBe("foo&bar;");
      expect(textValue(createRawTextToken("<&>", "RAWTEXT"))).toBe("<&>");
      expect(textValue(createRawTextToken("<&#>", "RAWTEXT"))).toBe("<&#>");
      expect(textValue(createRawTextToken("<&;>", "RAWTEXT"))).toBe("<&;>");
      expect(textValue(createRawTextToken("<&#x>", "RAWTEXT"))).toBe("<&#x>");
      expect(textValue(createRawTextToken("<&#z>", "RAWTEXT"))).toBe("<&#z>");
      expect(textValue(createRawTextToken("a &amp; b", "RAWTEXT"))).toBe("a &amp; b");
      expect(textValue(createRawTextToken("a&ampb", "RAWTEXT"))).toBe("a&ampb");
      expect(textValue(createRawTextToken("a &notin; b", "RAWTEXT"))).toBe("a &notin; b");
      expect(textValue(createRawTextToken("a &notit; b", "RAWTEXT"))).toBe("a &notit; b");
      expect(textValue(createRawTextToken("a &#38; b", "RAWTEXT"))).toBe("a &#38; b");
      expect(textValue(createRawTextToken("a &#38 b", "RAWTEXT"))).toBe("a &#38 b");
      expect(textValue(createRawTextToken("a&#38b", "RAWTEXT"))).toBe("a&#38b");
    });

    it("substitutes CR and CRLF", () => {
      expect(textValue(createRawTextToken("a\r\n", "RAWTEXT"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\r", "RAWTEXT"))).toBe("a\n");
      expect(textValue(createRawTextToken("a\n\n\nb\n\n\rc\n\r\nd\n\r\re\r\n\nf\r\n\rg\r\r\nh\r\r\ri", "RAWTEXT"))).toBe("a\n\n\nb\n\n\nc\n\nd\n\n\ne\n\nf\n\ng\n\nh\n\n\ni");
    });

    it("substitutes NUL", () => {
      expect(textValue(createRawTextToken("a\0b", "RAWTEXT"))).toBe("a\uFFFDb");
    });

    it("leaves tag-likes as is", () => {
      expect(textValue(createRawTextToken("<a>", "RAWTEXT"))).toBe("<a>");
      expect(textValue(createRawTextToken("<title></title>", "RAWTEXT"))).toBe("<title></title>");
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

describe("splitWhitespace", () => {
  describe("for RawTextToken", () => {
    function testCase(before: string, after: string) {
      const input = before + after;
      const expected = [
        before ? createRawTextToken(before) : undefined,
        after ? createRawTextToken(after) : undefined,
      ];
      it(`parses ${JSON.stringify(input)}`, () => {
        expect(splitWhitespace(createRawTextToken(input))).toEqual(expected);
      });
    }
    testCase("", "foo");
    testCase("", "foo bar");
    testCase("", "&#102;&#111;&#111;&#32;&#98;&#97;&#114;");
    testCase("", "&#0102;&#0111;&#0111;&#032;&#098;&#097;&#0114;");
    testCase("", "&#x66;&#x6f;&#x6f;&#x20;&#x62;&#x61;&#x72;");
    testCase("", "&#x066;&#x06f;&#x06f;&#x020;&#x062;&#x061;&#x072;");
    testCase("", "&#x66;&#x6F;&#x6F;&#x20;&#x62;&#x61;&#x72;");
    testCase("", "&#x066;&#x06F;&#x06F;&#x020;&#x062;&#x061;&#x072;");
    testCase("", "&#X66;&#X6f;&#X6f;&#X20;&#X62;&#X61;&#X72;");
    testCase("", "&#X066;&#X06f;&#X06f;&#X020;&#X062;&#X061;&#X072;");
    testCase(" ", "");
    testCase("&#32;", "");
    testCase("&#x20;", "");
    testCase("&#X20;", "");
    testCase(" ", "foo");
    testCase(" ", "foo bar");
    testCase("&#32;", "&#102;&#111;&#111;&#32;&#98;&#97;&#114;");
    testCase("&#032;", "&#0102;&#0111;&#0111;&#032;&#098;&#097;&#0114;");
    testCase("&#x20;", "&#x66;&#x6f;&#x6f;&#x20;&#x62;&#x61;&#x72;");
    testCase("&#x020;", "&#x066;&#x06f;&#x06f;&#x020;&#x062;&#x061;&#x072;");
    testCase("&#x20;", "&#x66;&#x6F;&#x6F;&#x20;&#x62;&#x61;&#x72;");
    testCase("&#x020;", "&#x066;&#x06F;&#x06F;&#x020;&#x062;&#x061;&#x072;");
    testCase("&#X20;", "&#X66;&#X6f;&#X6f;&#X20;&#X62;&#X61;&#X72;");
    testCase("&#X020;", "&#X066;&#X06f;&#X06f;&#X020;&#X062;&#X061;&#X072;");
    testCase("\r", "foo");
    testCase("&#13;", "&#102;&#111;&#111;");
    testCase("&#013;", "&#0102;&#0111;&#0111;");
    testCase("&#xd;", "&#x66;&#x6f;&#x6f;");
    testCase("&#x0d;", "&#x066;&#x06f;&#x06f;");
    testCase("&#xD;", "&#x66;&#x6F;&#x6F;");
    testCase("&#x0D;", "&#x066;&#x06F;&#x06F;");
    testCase("&#Xd;", "&#X66;&#X6f;&#X6f;");
    testCase("&#X0d;", "&#X066;&#X06f;&#X06f;");
    testCase("\n", "foo");
    testCase("&#10;", "&#102;&#111;&#111;");
    testCase("&#010;", "&#0102;&#0111;&#0111;");
    testCase("&#xa;", "&#x66;&#x6f;&#x6f;");
    testCase("&#x0a;", "&#x066;&#x06f;&#x06f;");
    testCase("&#xA;", "&#x66;&#x6F;&#x6F;");
    testCase("&#x0A;", "&#x066;&#x06F;&#x06F;");
    testCase("&#Xa;", "&#X66;&#X6f;&#X6f;");
    testCase("&#X0a;", "&#X066;&#X06f;&#X06f;");
    testCase("\t", "foo");
    testCase("&#9;", "&#102;&#111;&#111;");
    testCase("&#09;", "&#0102;&#0111;&#0111;");
    testCase("&#x9;", "&#x66;&#x6f;&#x6f;");
    testCase("&#x09;", "&#x066;&#x06f;&#x06f;");
    testCase("&#x9;", "&#x66;&#x6F;&#x6F;");
    testCase("&#x09;", "&#x066;&#x06F;&#x06F;");
    testCase("&#X9;", "&#X66;&#X6f;&#X6f;");
    testCase("&#X09;", "&#X066;&#X06f;&#X06f;");
    testCase("\f", "foo");
    testCase("&#12;", "&#102;&#111;&#111;");
    testCase("&#012;", "&#0102;&#0111;&#0111;");
    testCase("&#xc;", "&#x66;&#x6f;&#x6f;");
    testCase("&#x0c;", "&#x066;&#x06f;&#x06f;");
    testCase("&#xC;", "&#x66;&#x6F;&#x6F;");
    testCase("&#x0C;", "&#x066;&#x06F;&#x06F;");
    testCase("&#Xc;", "&#X66;&#X6f;&#X6f;");
    testCase("&#X0c;", "&#X066;&#X06f;&#X06f;");
    testCase("\r\n\t\f ", "foo");
    testCase("&#13;&#10;&#9;&#12;&#32;", "&#102;&#111;&#111;");
    testCase("&#013;&#010;&#09;&#012;&#032;", "&#0102;&#0111;&#0111;");
    testCase("&#xd;&#xa;&#x9;&#xc;&#x20;", "&#x66;&#x6f;&#x6f;");
    testCase("&#x0d;&#x0a;&#x09;&#x0c;&#x020;", "&#x066;&#x06f;&#x06f;");
    testCase("&#xD;&#xA;&#x9;&#xC;&#x20;", "&#x66;&#x6F;&#x6F;");
    testCase("&#x0D;&#x0A;&#x09;&#x0C;&#x020;", "&#x066;&#x06F;&#x06F;");
    testCase("&#Xd;&#Xa;&#X9;&#Xc;&#X20;", "&#X66;&#X6f;&#X6f;");
    testCase("&#X0d;&#X0a;&#X09;&#X0c;&#X020;", "&#X066;&#X06f;&#X06f;");
    testCase("\r\n\t\f ", "foo\r\n\t\f ");
    testCase("&#13;&#10;&#9;&#12;&#32;", "&#102;&#111;&#111;&#13;&#10;&#9;&#12;&#32;");
    testCase("&#013;&#010;&#09;&#012;&#032;", "&#0102;&#0111;&#0111;&#013;&#010;&#09;&#012;&#032;");
    testCase("&#xd;&#xa;&#x9;&#xc;&#x20;", "&#x66;&#x6f;&#x6f;&#xd;&#xa;&#x9;&#xc;&#x20;");
    testCase("&#x0d;&#x0a;&#x09;&#x0c;&#x020;", "&#x066;&#x06f;&#x06f;&#x0d;&#x0a;&#x09;&#x0c;&#x020;");
    testCase("&#xD;&#xA;&#x9;&#xC;&#x20;", "&#x66;&#x6F;&#x6F;&#xD;&#xA;&#x9;&#xC;&#x20;");
    testCase("&#x0D;&#x0A;&#x09;&#x0C;&#x020;", "&#x066;&#x06F;&#x06F;&#x0D;&#x0A;&#x09;&#x0C;&#x020;");
    testCase("&#Xd;&#Xa;&#X9;&#Xc;&#X20;", "&#X66;&#X6f;&#X6f;&#Xd;&#Xa;&#X9;&#Xc;&#X20;");
    testCase("&#X0d;&#X0a;&#X09;&#X0c;&#X020;", "&#X066;&#X06f;&#X06f;&#X0d;&#X0a;&#X09;&#X0c;&#X020;");
    testCase("\r\n\t\f \r\n\t\f ", "");
    testCase("&#13;&#10;&#9;&#12;&#32;&#13;&#10;&#9;&#12;&#32;", "");
    testCase("&#013;&#010;&#09;&#012;&#032;&#013;&#010;&#09;&#012;&#032;", "");
    testCase("&#xd;&#xa;&#x9;&#xc;&#x20;&#xd;&#xa;&#x9;&#xc;&#x20;", "");
    testCase("&#x0d;&#x0a;&#x09;&#x0c;&#x020;&#x0d;&#x0a;&#x09;&#x0c;&#x020;", "");
    testCase("&#xD;&#xA;&#x9;&#xC;&#x20;&#xD;&#xA;&#x9;&#xC;&#x20;", "");
    testCase("&#x0D;&#x0A;&#x09;&#x0C;&#x020;&#x0D;&#x0A;&#x09;&#x0C;&#x020;", "");
    testCase("&#Xd;&#Xa;&#X9;&#Xc;&#X20;&#Xd;&#Xa;&#X9;&#Xc;&#X20;", "");
    testCase("&#X0d;&#X0a;&#X09;&#X0c;&#X020;&#X0d;&#X0a;&#X09;&#X0c;&#X020;", "");
    testCase("", "&");
    testCase("", "&#");
    testCase("", "&#3");
    testCase("&#32", "");
    testCase("", "&#320");
    testCase("", "&#329");
    testCase("&#32", "a");
    testCase("&#32", "A");
    testCase("&#32", "f");
    testCase("&#32", "F");
    testCase("&#32", "z");
    testCase("&#32", "Z");
    testCase("&#32", ".");
    testCase("&#32&#32;", "");
    testCase("&#32;&#32;", "");
    testCase("&#32;", ";&#32;");
    testCase("", "&#x");
    testCase("", "&#X");
    testCase("", "&#x2");
    testCase("&#x20", "");
    testCase("", "&#x200");
    testCase("", "&#x209");
    testCase("", "&#x20a");
    testCase("", "&#x20A");
    testCase("", "&#x20f");
    testCase("", "&#x20F");
    testCase("&#x20", "g");
    testCase("&#x20", "G");
    testCase("&#x20", "z");
    testCase("&#x20", "Z");
    testCase("&#x20", ".");
    testCase("&#x20&#32;", "");
    testCase("&#x20;&#32;", "");
    testCase("&#x20;", ";&#32;");
    testCase("&NewLine;", "");
    testCase("&Tab;", "");
    testCase("", "&NewLine");
    testCase("", "&Tab");
    testCase("", "&amp;");
    testCase("", "&foo;");
    testCase("", "&newline;");
    testCase("", "&tab;");
  });
  describe("for TextToken", () => {
    function testCase(before: string, after: string) {
      const input = before + after;
      const expected = [
        before ? createTextToken(before) : undefined,
        after ? createTextToken(after) : undefined,
      ];
      it(`parses ${JSON.stringify(input)}`, () => {
        expect(splitWhitespace(createTextToken(input))).toEqual(expected);
      });
    }
    testCase("", "foo");
    testCase("", "foo bar");
    testCase(" ", "");
    testCase(" ", "foo");
    testCase(" ", "foo bar");
    testCase("\r", "foo");
    testCase("\n", "foo");
    testCase("\t", "foo");
    testCase("\f", "foo");
    testCase("\r\n\t\f ", "foo");
    testCase("\r\n\t\f ", "foo\r\n\t\f ");
    testCase("\r\n\t\f \r\n\t\f ", "");
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
