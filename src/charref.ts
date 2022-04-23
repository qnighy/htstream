import { entities, semilessEntities } from "./entities";

const entityNames = /* #__PURE__ */ generateEntityNames();
const semilessEntityDict = /* #__PURE__ */ generateSemilessEntityDict();

export function maybeInCharacterReference(s: string): boolean {
  if (/^&[a-zA-Z][a-zA-Z0-9]*$/.test(s)) {
    // Is it a prefix of an entity name? (e.g. "am" is a prefix of "amp")
    const name = s.substring(1);
    // Binary search
    // Loop invariants:
    // - entityNames[lo] < name <= entityNames[hi]
    //   where entityNames[-1] is a minimal sentinel,
    //     and entityNames[entityNames.length] is a maximal sentinel
    let lo = -1, hi = entityNames.length;
    while (hi - lo > 1) {
      const mid = lo + (hi - lo) / 2 | 0;
      if (name <= entityNames[mid]) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    // Here we have:
    //   name is a prefix of an entity name
    //   <=> name is a prefix of entityNames[hi]
    return hi < entityNames.length && entityNames[hi].startsWith(name);
  }
  // This pattern represents the set of non-empty proper prefixes of
  // /^&#(?:[xX][0-9a-fA-F]+|[0-9]+);$/
  return /^&(?:#(?:[xX][0-9a-fA-F]*|[0-9]*)?)?$/.test(s);
}

/**
 * @param s a string which is known to match /^&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?$/
 */
export function evaluateCharacterReference(s: string): string {
  if (s[1] === "#") {
    if (s[2] === "x" || s[2] === "X") {
      // parseInt ignores semicolon
      return fromWebCodePoint(parseInt(s.substring(3), 16));
    } else {
      // parseInt ignores semicolon
      return fromWebCodePoint(parseInt(s.substring(2), 10));
    }
  }
  if (s.endsWith(";")) {
    const name = s.substring(1, s.length - 1);
    if (Object.prototype.hasOwnProperty.call(entities, name)) {
      return entities[name];
    }
  }
  const maybeName = s.substring(1);
  if (Object.prototype.hasOwnProperty.call(semilessEntityDict, maybeName[0])) {
    for (const name of semilessEntityDict[maybeName[0]]) {
      if (maybeName.startsWith(name)) {
        return `${entities[name]}${maybeName.substring(name.length)}`;
      }
    }
  }
  return s;
}

function fromWebCodePoint(cp: number): string {
  if ((0 < cp && cp < 0x80) || (0xA0 <= cp && cp < 0xD800) || (0xE000 <= cp && cp < 0x110000)) {
    return String.fromCodePoint(cp);
  } else if (Object.prototype.hasOwnProperty.call(windows1252CompatMapping, cp)) {
    return windows1252CompatMapping[cp];
  } else if (0x80 <= cp && cp < 0xA0) {
    return String.fromCodePoint(cp);
  }
  // Out of range or null
  return "\uFFFD";
}

const windows1252CompatMapping: Record<number, string> = {
  0x80: "\u20AC",
  0x82: "\u201A",
  0x83: "\u0192",
  0x84: "\u201E",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02C6",
  0x89: "\u2030",
  0x8A: "\u0160",
  0x8B: "\u2039",
  0x8C: "\u0152",
  0x8E: "\u017D",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201C",
  0x94: "\u201D",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02DC",
  0x99: "\u2122",
  0x9A: "\u0161",
  0x9B: "\u203A",
  0x9C: "\u0153",
  0x9E: "\u017E",
  0x9F: "\u0178",
};

function generateEntityNames(): string[] {
  return Object.keys(entities).sort();
}

function generateSemilessEntityDict(): Record<string, string[]> {
  const dict: Record<string, string[]> = {};
  for (const name of semilessEntities) {
    if (!Object.prototype.hasOwnProperty.call(dict, name[0])) {
      dict[name[0]] = [];
    }
    // Reverse the order to ensure longest match
    dict[name[0]].unshift(name);
  }
  return dict;
}
