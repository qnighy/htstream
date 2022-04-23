import { describe, expect, it } from "@jest/globals";
import { evaluateCharacterReference, maybeInCharacterReference } from "./charref";

describe("maybeInCharacterReference", () => {
  it("returns false for strings not starting with &", () => {
    expect(maybeInCharacterReference("")).toBe(false);
    expect(maybeInCharacterReference("amp")).toBe(false);
  });

  it("returns false for complete character references", () => {
    expect(maybeInCharacterReference("&#123;")).toBe(false);
    expect(maybeInCharacterReference("&#xA0;")).toBe(false);
    expect(maybeInCharacterReference("&amp;")).toBe(false);
    expect(maybeInCharacterReference("&Acirc;")).toBe(false);
  });

  it("returns false for strings starting with a complete character reference", () => {
    expect(maybeInCharacterReference("&#123; + 1")).toBe(false);
    expect(maybeInCharacterReference("&#xA0;.")).toBe(false);
    expect(maybeInCharacterReference("&amp; &amp;")).toBe(false);
    expect(maybeInCharacterReference("&Acirc; B")).toBe(false);
  });

  it("returns false for character references closed by an invalid character", () => {
    expect(maybeInCharacterReference("&%")).toBe(false);
    expect(maybeInCharacterReference("&#o")).toBe(false);
    expect(maybeInCharacterReference("&# ")).toBe(false);
    expect(maybeInCharacterReference("&#xG0;")).toBe(false);
    expect(maybeInCharacterReference("&#FFFF;")).toBe(false);
    expect(maybeInCharacterReference("&amp+")).toBe(false);
  });

  it("returns false for invalid character reference names", () => {
    expect(maybeInCharacterReference("&foobar;")).toBe(false);
    expect(maybeInCharacterReference("&foo")).toBe(false);
  });

  it("returns true if the string may be a part of character reference", () => {
    expect(maybeInCharacterReference("&")).toBe(true);
    expect(maybeInCharacterReference("&#")).toBe(true);
    expect(maybeInCharacterReference("&#x")).toBe(true);
    expect(maybeInCharacterReference("&#x0")).toBe(true);
    expect(maybeInCharacterReference("&#x0F")).toBe(true);
    expect(maybeInCharacterReference("&#4")).toBe(true);
    expect(maybeInCharacterReference("&#45")).toBe(true);
    expect(maybeInCharacterReference("&#452")).toBe(true);
    expect(maybeInCharacterReference("&a")).toBe(true);
    expect(maybeInCharacterReference("&am")).toBe(true);
    // Still need to wait to check if it is followed by `;`
    expect(maybeInCharacterReference("&amp")).toBe(true);
    expect(maybeInCharacterReference("&f")).toBe(true);
    expect(maybeInCharacterReference("&fs")).toBe(true);
    expect(maybeInCharacterReference("&fsc")).toBe(true);
    expect(maybeInCharacterReference("&fscr")).toBe(true);
  });
});

describe("evaluteCharacterReference", () => {
  it("evaluates numeric character references", () => {
    expect(evaluateCharacterReference("&#106;")).toBe("j");
    expect(evaluateCharacterReference("&#0106;")).toBe("j");
    expect(evaluateCharacterReference("&#x6a;")).toBe("j");
    expect(evaluateCharacterReference("&#x6A;")).toBe("j");
    expect(evaluateCharacterReference("&#X6a;")).toBe("j");
    expect(evaluateCharacterReference("&#X6A;")).toBe("j");
  });

  it("evaluates very long numeric character references", () => {
    expect(evaluateCharacterReference("&#000000000000000000000000000106;")).toBe("j");
    expect(evaluateCharacterReference("&#x0000000000000000000000000006a;")).toBe("j");
  });

  it("evaluates Windows-1252-compatible numeric character references", () => {
    expect(evaluateCharacterReference("&#x7F;")).toBe("\u007F");
    expect(evaluateCharacterReference("&#x80;")).toBe("\u20AC");
    expect(evaluateCharacterReference("&#x81;")).toBe("\u0081");
    expect(evaluateCharacterReference("&#x82;")).toBe("\u201A");
    expect(evaluateCharacterReference("&#x9F;")).toBe("\u0178");
    expect(evaluateCharacterReference("&#xA0;")).toBe("\u00A0");
    expect(evaluateCharacterReference("&#127;")).toBe("\u007F");
    expect(evaluateCharacterReference("&#128;")).toBe("\u20AC");
    expect(evaluateCharacterReference("&#129;")).toBe("\u0081");
    expect(evaluateCharacterReference("&#130;")).toBe("\u201A");
    expect(evaluateCharacterReference("&#159;")).toBe("\u0178");
    expect(evaluateCharacterReference("&#160;")).toBe("\u00A0");
  });

  it("evaluates invalidly-coded numeric character references", () => {
    expect(evaluateCharacterReference("&#x0;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#0;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xD7FF;")).toBe("\uD7FF");
    expect(evaluateCharacterReference("&#55295;")).toBe("\uD7FF");
    expect(evaluateCharacterReference("&#xD800;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#55296;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xD801;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#55297;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xDBFF;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#56319;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xDC00;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#56320;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xDC01;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#56321;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xDFFF;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#57343;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xE000;")).toBe("\uE000");
    expect(evaluateCharacterReference("&#57344;")).toBe("\uE000");
    expect(evaluateCharacterReference("&#xE001;")).toBe("\uE001");
    expect(evaluateCharacterReference("&#57345;")).toBe("\uE001");
    expect(evaluateCharacterReference("&#xFFFC;")).toBe("\uFFFC");
    expect(evaluateCharacterReference("&#65532;")).toBe("\uFFFC");
    expect(evaluateCharacterReference("&#xFFFD;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#65533;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#xFFFE;")).toBe("\uFFFE");
    expect(evaluateCharacterReference("&#65534;")).toBe("\uFFFE");
    expect(evaluateCharacterReference("&#xFFFF;")).toBe("\uFFFF");
    expect(evaluateCharacterReference("&#65535;")).toBe("\uFFFF");
    expect(evaluateCharacterReference("&#x10000;")).toBe("\u{10000}");
    expect(evaluateCharacterReference("&#65536;")).toBe("\u{10000}");
    expect(evaluateCharacterReference("&#x10001;")).toBe("\u{10001}");
    expect(evaluateCharacterReference("&#65537;")).toBe("\u{10001}");
    expect(evaluateCharacterReference("&#x10FFFF;")).toBe("\u{10FFFF}");
    expect(evaluateCharacterReference("&#1114111;")).toBe("\u{10FFFF}");
    expect(evaluateCharacterReference("&#x110000;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#1114112;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#x110001;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#1114113;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#x123456789ABCDEF123456789ABCDEF;")).toBe("\uFFFD");
    expect(evaluateCharacterReference("&#123456789123456789123456789123456789;")).toBe("\uFFFD");
    expect(evaluateCharacterReference(`&#x${"123456789ABCDEF".repeat(1000)};`)).toBe("\uFFFD");
    expect(evaluateCharacterReference(`&#${"123456789".repeat(3000)};`)).toBe("\uFFFD");
  });

  it("evaluates incomplete numeric character references", () => {
    expect(evaluateCharacterReference("&#106")).toBe("j");
    expect(evaluateCharacterReference("&#0106")).toBe("j");
    expect(evaluateCharacterReference("&#x6a")).toBe("j");
    expect(evaluateCharacterReference("&#x6A")).toBe("j");
    expect(evaluateCharacterReference("&#X6a")).toBe("j");
    expect(evaluateCharacterReference("&#X6A")).toBe("j");
  });

  it("evaluates named character references", () => {
    expect(evaluateCharacterReference("&amp;")).toBe("&");
    expect(evaluateCharacterReference("&lt;")).toBe("<");
    expect(evaluateCharacterReference("&gt;")).toBe(">");
    expect(evaluateCharacterReference("&quot;")).toBe("\"");
    expect(evaluateCharacterReference("&frac23;")).toBe("\u2154");
  });

  it("evaluates incomplete named character references", () => {
    expect(evaluateCharacterReference("&amp")).toBe("&");
    expect(evaluateCharacterReference("&lt")).toBe("<");
    expect(evaluateCharacterReference("&gt")).toBe(">");
    expect(evaluateCharacterReference("&quot")).toBe("\"");
  });

  it("keeps incomplete named character references as it is", () => {
    expect(evaluateCharacterReference("&frac23")).toBe("&frac23");
  });

  it("evaluates incomplete named character references with trailing characters", () => {
    expect(evaluateCharacterReference("&ampfoo;")).toBe("&foo;");
    expect(evaluateCharacterReference("&ltbar;")).toBe("<bar;");
    expect(evaluateCharacterReference("&gtbaz;")).toBe(">baz;");
    expect(evaluateCharacterReference("&quotquux;")).toBe("\"quux;");

    expect(evaluateCharacterReference("&ampfoo")).toBe("&foo");
    expect(evaluateCharacterReference("&ltbar")).toBe("<bar");
    expect(evaluateCharacterReference("&gtbaz")).toBe(">baz");
    expect(evaluateCharacterReference("&quotquux")).toBe("\"quux");
  });

  it("keeps incomplete named character references with trailing characters as it is", () => {
    expect(evaluateCharacterReference("&frac23foo")).toBe("&frac23foo");
  });

  it("keeps invalid character references as it is", () => {
    expect(evaluateCharacterReference("&foo;")).toBe("&foo;");
  });
});
