import fs from "node:fs";
import glob from "glob";
import { describe, expect, it } from "@jest/globals";
import { Tokenizer } from ".";

const testcases = glob.sync("testdata/normalize/**/*.html", {
  ignore: "**/*.normal.html",
});

for (const testcase of testcases) {
  describe(testcase, () => {
    it("roundtrips", () => {
      const chunkSize = 1024;
      const text = fs.readFileSync(testcase, "utf-8");
      let result = "";
      const tokenizer = new Tokenizer();
      for(let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize);
        tokenizer.addChunk(chunk, (token) => {
          result += token.raw;
        });
      }
      tokenizer.finish((token) => {
        result += token.raw;
      });
      expect(result).toBe(text);
    });
  });
}
