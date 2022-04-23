// @ts-check
import fs from "node:fs";
import path from "node:path";
import https from "node:https";

/** @type {Record<string, { codepoints: number[], characters: string }>} */
let json;
if (fs.existsSync("scripts/entities.json")) {
  json = JSON.parse(await fs.promises.readFile("scripts/entities.json", "utf8"));
} else {
  const data = await get("https://html.spec.whatwg.org/entities.json");
  await fs.promises.writeFile("scripts/entities.json", data);
  json = JSON.parse(data.toString("utf-8"));
}

// Validation
for (const [name, { codepoints, characters }] of Object.entries(json)) {
  if (String.fromCodePoint(...codepoints) !== characters) {
    throw new Error(`Invalid entity: ${name}: codepoint mismatch`);
  }
  if (/^&[a-zA-Z][a-zA-Z0-9]*;$/.test(name)) {
    // OK
  } else if (/^&[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
    if (characters !== json[`${name};`].characters) {
      throw new Error(`Invalid entity: ${name}: does not correspond with semiful version`)
    }
  } else {
    throw new Error(`Invalid entity: ${name}: invalid format`)
  }
}

let src = "export const entities: Record<string, string> = {\n";
for (const [name, { codepoints }] of Object.entries(json)) {
  if (name.endsWith(";")) {
    const str = codepoints.map((cp) => {
      if (cp < 0x10000) {
        return `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
      } else {
        return `\\u{${cp.toString(16).toUpperCase()}}`;
      }
    }).join("");
    src += `  ${name.substring(1, name.length - 1)}: "${str}",\n`;
  }
}
src += "};\n";
src += "\n";

/** @type {string[]} */
const semilessKeys = [];
for (const name of Object.keys(json)) {
  if (!name.endsWith(";")) {
    semilessKeys.push(name.substring(1));
  }
}
semilessKeys.sort();
src += `export const semilessEntities: string[] = [\n`;
for (const semilessKey of semilessKeys) {
  src += `  "${semilessKey}",\n`;
}
src += "];\n";

await fs.promises.writeFile("src/entities.ts", src);

/**
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
function get(url) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const buffers = [];
    https.get(url, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Bad status code: ${res.statusCode}`));
        res.resume();
        return;
      }
      res.on("data", (chunk) => {
        buffers.push(chunk);
      });
      res.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
    });
  });
}
