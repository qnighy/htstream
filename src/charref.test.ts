import { describe, expect, it } from "@jest/globals";
import { maybeInCharacterReference } from "./charref";

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
