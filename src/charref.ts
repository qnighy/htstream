import { entities } from "./entities";

const entityNames = /* #__PURE__ */ Object.keys(entities).sort();

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
