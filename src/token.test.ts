import { describe, expect, it } from "@jest/globals";
import { TextToken } from "./token";

describe("TextToken", () => {
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
