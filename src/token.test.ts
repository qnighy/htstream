import { describe, expect, it } from "@jest/globals";
import { TextToken, normalizeTagName, StartTagToken, EndTagToken } from "./token";

describe("TextToken", () => {
  describe("constructor", () => {
    it("returns a TextToken with the specified text", () => {
      expect(new TextToken("foo").value).toBe("foo");
      expect(new TextToken("<foo> & <bar>").value).toBe("<foo> & <bar>");
    });

    it("returns a TextToken without a raw text", () => {
      expect(new TextToken("foo").raw).toBe(undefined);
      expect(new TextToken("<foo> & <bar>").raw).toBe(undefined);
    });
  });

  describe("createRawToken", () => {
    it("returns an instance of TextToken", () => {
      expect(TextToken.createRawToken("Hello, world!")).toBeInstanceOf(TextToken);
      expect(TextToken.createRawToken("a & b")).toBeInstanceOf(TextToken);
    });

    it("returns a TextToken with the specified raw text", () => {
      expect(TextToken.createRawToken("Hello, world!").raw).toBe("Hello, world!");
      expect(TextToken.createRawToken("a &amp; b\r\n").raw).toBe("a &amp; b\r\n");
      expect(TextToken.createRawToken("a & b\n").raw).toBe("a & b\n");
    });

    describe("value", () => {
      it("returns the parsed value (general case)", () => {
        expect(TextToken.createRawToken("Hello, world!").value).toBe("Hello, world!");
      });

      it("doesn't substitute stray <s", () => {
        expect(TextToken.createRawToken("a < b").value).toBe("a < b");
      });

      it("doesn't substitute invalid &s", () => {
        expect(TextToken.createRawToken("a &").value).toBe("a &");
        expect(TextToken.createRawToken("a & b").value).toBe("a & b");
        expect(TextToken.createRawToken("foo&bar;").value).toBe("foo&bar;");
        expect(TextToken.createRawToken("<&>").value).toBe("<&>");
        expect(TextToken.createRawToken("<&#>").value).toBe("<&#>");
        expect(TextToken.createRawToken("<&;>").value).toBe("<&;>");
        expect(TextToken.createRawToken("<&#x>").value).toBe("<&#x>");
        expect(TextToken.createRawToken("<&#z>").value).toBe("<&#z>");
      });

      it("substitutes character references", () => {
        expect(TextToken.createRawToken("a &amp; b").value).toBe("a & b");
        expect(TextToken.createRawToken("a&ampb").value).toBe("a&b");
        expect(TextToken.createRawToken("a &notin; b").value).toBe("a \u2209 b");
        expect(TextToken.createRawToken("a &notit; b").value).toBe("a \u00ACit; b");
        expect(TextToken.createRawToken("a &#38; b").value).toBe("a & b");
        expect(TextToken.createRawToken("a &#38 b").value).toBe("a & b");
        expect(TextToken.createRawToken("a&#38b").value).toBe("a&b");
      });

      it("substitutes CR and CRLF", () => {
        expect(TextToken.createRawToken("a\r\n").value).toBe("a\n");
        expect(TextToken.createRawToken("a\r").value).toBe("a\n");
        expect(TextToken.createRawToken("a\n\n\nb\n\n\rc\n\r\nd\n\r\re\r\n\nf\r\n\rg\r\r\nh\r\r\ri").value).toBe("a\n\n\nb\n\n\nc\n\nd\n\n\ne\n\nf\n\ng\n\nh\n\n\ni");
      });
    });

  });
});

describe("StartTagToken", () => {
  describe("constructor", () => {
    it("returns a StartTagToken with the specified name", () => {
      expect(new StartTagToken("foo").name).toBe("foo");
    });

    it("normalizes the tag name", () => {
      expect(new StartTagToken("FOO").name).toBe("foo");
      expect(new StartTagToken("F\xD2\xD3").name).toBe("f\xD2\xD3");
      expect(new StartTagToken("F\0O").name).toBe("f\uFFFDo");
    });

    it("returns a TextToken without a raw text", () => {
      expect(new StartTagToken("foo").raw).toBe(undefined);
    });
  });

  describe("createRawToken", () => {
    it("returns an instance of StartTagToken", () => {
      expect(StartTagToken.createRawToken("<foo>")).toBeInstanceOf(StartTagToken);
    });

    it("returns a StartTagToken with the specified raw text", () => {
      expect(StartTagToken.createRawToken("<foo>").raw).toBe("<foo>");
      expect(StartTagToken.createRawToken("<FOO>").raw).toBe("<FOO>");
      expect(StartTagToken.createRawToken("<foo  bar=baz>").raw).toBe("<foo  bar=baz>");
      expect(StartTagToken.createRawToken("<foo  bar=\"baz\">").raw).toBe("<foo  bar=\"baz\">");
    });

    it("extracts the tag name", () => {
      expect(StartTagToken.createRawToken("<foo>").name).toBe("foo");
    });

    it("normalizes the extracted tag name", () => {
      expect(StartTagToken.createRawToken("<FOO>").name).toBe("foo");
      expect(StartTagToken.createRawToken("<F\xD2\xD3>").name).toBe("f\xD2\xD3");
      expect(StartTagToken.createRawToken("<F\0O>").name).toBe("f\uFFFDo");
    });
  });
});

describe("EndTagToken", () => {
  describe("constructor", () => {
    it("returns a EndTagToken with the specified name", () => {
      expect(new EndTagToken("foo").name).toBe("foo");
    });

    it("normalizes the tag name", () => {
      expect(new EndTagToken("FOO").name).toBe("foo");
      expect(new EndTagToken("F\xD2\xD3").name).toBe("f\xD2\xD3");
      expect(new EndTagToken("F\0O").name).toBe("f\uFFFDo");
    });

    it("returns a TextToken without a raw text", () => {
      expect(new EndTagToken("foo").raw).toBe(undefined);
    });
  });

  describe("createRawToken", () => {
    it("returns an instance of EndTagToken", () => {
      expect(EndTagToken.createRawToken("</foo>")).toBeInstanceOf(EndTagToken);
    });

    it("returns a EndTagToken with the specified raw text", () => {
      expect(EndTagToken.createRawToken("</foo>").raw).toBe("</foo>");
      expect(EndTagToken.createRawToken("</FOO>").raw).toBe("</FOO>");
      expect(EndTagToken.createRawToken("</foo  >").raw).toBe("</foo  >");
    });

    it("extracts the tag name", () => {
      expect(EndTagToken.createRawToken("</foo>").name).toBe("foo");
    });

    it("normalizes the extracted tag name", () => {
      expect(EndTagToken.createRawToken("</FOO>").name).toBe("foo");
      expect(EndTagToken.createRawToken("</F\xD2\xD3>").name).toBe("f\xD2\xD3");
      expect(EndTagToken.createRawToken("</F\0O>").name).toBe("f\uFFFDo");
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
