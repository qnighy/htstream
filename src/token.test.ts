import { describe, expect, it } from "@jest/globals";
import { normalizeTagName, createRawStartTagToken, textValue, createRawTextToken, createTextToken, createStartTagToken, createEndTagToken, createRawEndTagToken } from "./token";

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
