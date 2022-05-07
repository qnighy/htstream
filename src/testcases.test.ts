import fs from "node:fs";
import glob from "glob";
import { describe, expect, it } from "@jest/globals";
import { Global as JestGlobal } from "@jest/types";
import { Tokenizer } from "./tokenizer";
import { appendToken, createTextToken, parseToken } from "./token";
import { serializeDocument, TreeBuilder } from "./tree";
import { TokenParser } from "./parser";

const updateSnapshots = process.env.UPDATE_SNAPSHOTS === "true";

const testcases = glob.sync("testdata/normalize/**/*.html", {
  ignore: "**/*.tokenize.html",
});

type TestcaseMetadata = {
  roundtrip?: "skip" | "only";
  tokenize?: "skip" | "only";
  parse?: "skip" | "only";
};

for (const testcase of testcases) {
  const metaPath = testcase.replace(/\.html$/, ".meta.json");
  const meta: TestcaseMetadata = fs.existsSync(metaPath) ?  JSON.parse(fs.readFileSync(metaPath, "utf-8")) : {};

  describe(testcase, () => {
    selectIt(it, meta.roundtrip)("roundtrips", () => {
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
    selectIt(it, meta.tokenize)("normalizes token-wise", () => {
      const expectedPath = testcase.replace(/\.html$/, ".tokenize.html");
      const chunkSize = 1024;
      const text = fs.readFileSync(testcase, "utf-8");
      const expected = fs.existsSync(expectedPath) ?  fs.readFileSync(expectedPath, "utf-8") : null;
      let result = "";
      const tokenizer = new Tokenizer();
      for(let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize);
        tokenizer.addChunk(chunk, (token) => {
          result = appendToken(parseToken(token) ?? createTextToken(""), result);
        });
      }
      tokenizer.finish((token) => {
        result = appendToken(parseToken(token) ?? createTextToken(""), result);
      });
      if (result !== expected && updateSnapshots) {
        fs.writeFileSync(expectedPath, result, "utf-8");
        console.warn(`Updated snapshot for ${testcase}`);
      } else {
        expect(result).toBe(expected);
      }
    });
    selectIt(it, meta.parse)("normalizes", () => {
      const expectedPath = testcase.replace(/\.html$/, ".parse.html");
      const chunkSize = 1024;
      const text = fs.readFileSync(testcase, "utf-8");
      const expected = fs.existsSync(expectedPath) ?  fs.readFileSync(expectedPath, "utf-8") : null;
      const tokenizer = new Tokenizer();
      const parser = new TokenParser();
      const treeBuilder = new TreeBuilder();
      for(let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize);
        tokenizer.addChunk(chunk, (token) => {
          parser.addToken(token, (action) => {
            treeBuilder.act(action);
          });
        });
      }
      tokenizer.finish((token) => {
        parser.addToken(token, (action) => {
          treeBuilder.act(action);
        });
      });
      parser.finish((action) => {
        treeBuilder.act(action);
      });

      let result = "";
      serializeDocument(treeBuilder.document, (chunk) => {
        result += chunk;
      });

      if (result !== expected && updateSnapshots) {
        fs.writeFileSync(expectedPath, result, "utf-8");
        console.warn(`Updated snapshot for ${testcase}`);
      } else {
        expect(result).toBe(expected);
      }
    });
  });
}

function selectIt(itBase: JestGlobal.It, kind?: "skip" | "only"): JestGlobal.ItBase {
  return (
    kind === "skip" ? itBase.skip :
    kind === "only" ? itBase.only :
    itBase
  );
}
