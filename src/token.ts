import { evaluateCharacterReference } from "./charref";

export type Token =
  | TextToken
  | RawTextToken
  | StartTagToken
  | RawStartTagToken
  | EndTagToken
  | RawEndTagToken
  | DoctypeToken
  | RawDoctypeToken
  | CommentToken
  | RawCommentToken
  | GarbageToken;
export type RawToken =
  | RawTextToken
  | RawStartTagToken
  | RawEndTagToken
  | RawDoctypeToken
  | RawCommentToken
  | GarbageToken;
export type TextTokenLike = TextToken | RawTextToken;
export type StartTagTokenLike = StartTagToken | RawStartTagToken;
export type EndTagTokenLike = EndTagToken | RawEndTagToken;
export type DoctypeTokenLike = DoctypeToken | RawDoctypeToken;
export type CommentTokenLike = CommentToken | RawCommentToken;

export type ParsedToken<T extends Token> =
  T extends RawTextToken ? TextToken :
  T extends RawStartTagToken ? StartTagToken :
  T extends RawEndTagToken ? EndTagToken :
  T extends RawDoctypeToken ? DoctypeToken :
  T extends RawCommentToken ? CommentToken :
  T extends GarbageToken ? null :
  T;

export type TextToken = {
  type: "TextToken";
  value: string;
};

export type RawTextToken = {
  type: "RawTextToken";
  kind: RawTextTokenKind;
  raw: string;
};

export type RawTextTokenKind = "data" | "RCDATA" | "RAWTEXT";

export type StartTagToken = {
  type: "StartTagToken";
  tagName: string;
  attributes: Record<string, string>;
}

export type RawStartTagToken = {
  type: "RawStartTagToken";
  tagName: string;
  raw: string;
};

export type EndTagToken = {
  type: "EndTagToken";
  tagName: string;
};

export type RawEndTagToken = {
  type: "RawEndTagToken";
  tagName: string;
  raw: string;
};

export type DoctypeToken = {
  type: "DoctypeToken";
};

export type RawDoctypeToken = {
  type: "RawDoctypeToken";
  raw: string;
};

export type CommentToken = {
  type: "CommentToken";
  value: string;
};

export type RawCommentToken = {
  type: "RawCommentToken";
  raw: string;
};

export type GarbageToken = {
  type: "GarbageToken";
  raw: string;
};

export function isTextTokenLike(token: Token): token is TextTokenLike {
  return token.type === "TextToken" || token.type === "RawTextToken";
}

export function isStartTagTokenLike(token: Token): token is StartTagTokenLike {
  return token.type === "StartTagToken" || token.type === "RawStartTagToken";
}

export function isEndTagTokenLike(token: Token): token is EndTagTokenLike {
  return token.type === "EndTagToken" || token.type === "RawEndTagToken";
}

export function isDoctypeTokenLike(token: Token): token is DoctypeTokenLike {
  return token.type === "DoctypeToken" || token.type === "RawDoctypeToken";
}

export function isCommentTokenLike(token: Token): token is CommentTokenLike {
  return token.type === "CommentToken" || token.type === "RawCommentToken";
}

export function createTextToken(value: string): TextToken {
  return {
    type: "TextToken",
    value,
  };
}

export function createRawTextToken(raw: string, kind: RawTextTokenKind = "data"): RawTextToken {
  return {
    type: "RawTextToken",
    kind,
    raw,
  };
}

export function createStartTagToken(tagName: string, attributes: Record<string, string> = {}): StartTagToken {
  return {
    type: "StartTagToken",
    tagName: normalizeTagName(tagName),
    attributes,
  };
}

export function createRawStartTagToken(raw: string): RawStartTagToken {
  const tagName = normalizeTagName(/^<([a-zA-Z][^ \r\n\t\f/>]*)/.exec(raw)![1]);
  return {
    type: "RawStartTagToken",
    tagName,
    raw,
  };
}

export function createEndTagToken(tagName: string): EndTagToken {
  return {
    type: "EndTagToken",
    tagName: normalizeTagName(tagName),
  };
}

export function createRawEndTagToken(raw: string): RawEndTagToken {
  const tagName = normalizeTagName(/^<\/([a-zA-Z][^ \r\n\t\f/>]*)/.exec(raw)![1]);
  return {
    type: "RawEndTagToken",
    tagName,
    raw,
  };
}

export function createDoctypeToken(): DoctypeToken {
  return {
    type: "DoctypeToken",
  };
}

export function createRawDoctypeToken(raw: string): RawDoctypeToken {
  return {
    type: "RawDoctypeToken",
    raw,
  };
}

export function createCommentToken(value: string): CommentToken {
  return {
    type: "CommentToken",
    value,
  };
}

export function createRawCommentToken(raw: string): RawCommentToken {
  return {
    type: "RawCommentToken",
    raw,
  };
}

export function createGarbageToken(raw: string): GarbageToken {
  return {
    type: "GarbageToken",
    raw,
  };
}

export function parseToken<T extends Token>(token: T): ParsedToken<T>;
export function parseToken(token: Token): ParsedToken<Token> {
  switch (token.type) {
    case "RawTextToken":
      return createTextToken(textValue(token));
    case "RawStartTagToken":
      return createStartTagToken(token.tagName, parseAttributes(token.raw));
    case "RawEndTagToken":
      return createEndTagToken(token.tagName);
    case "RawDoctypeToken":
      return createDoctypeToken();
    case "RawCommentToken":
      return createCommentToken(commentValue(token));
    case "GarbageToken":
      return null;
    default:
      return token;
  }
}

const escapeMap = {
  "&": "&amp;",
  "\xA0": "&nbsp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function appendToken(token: Token, base: string = ""): string {
  let s = base;
  switch (token.type) {
    case "TextToken":
      s += token.value.replace(/[&\xA0<>]/g, (c) => escapeMap[c as "&" | "\xA0" | "<" | ">"]);
      break;
    case "RawTextToken":
      s += token.raw;
      break;
    case "StartTagToken":
      s += `<${token.tagName}>`;
      break;
    case "RawStartTagToken":
      s += token.raw;
      break;
    case "EndTagToken":
      s += `</${token.tagName}>`;
      break;
    case "RawEndTagToken":
      s += token.raw;
      break;
    case "DoctypeToken":
      s += "<!doctype html>";
      break;
    case "RawDoctypeToken":
      s += token.raw;
      break;
    case "CommentToken":
      s += `<!--${token.value}-->`;
      break;
    case "RawCommentToken":
      s += token.raw;
      break;
    case "GarbageToken":
      s += token.raw;
      break;
    default: {
      const _token: never = token;
      throw new Error(`TODO: ${(_token as any).type}`);
    }
  }
  return s;
}

export function textValue(token: TextTokenLike): string {
  if (token.type === "RawTextToken") {
    if (token.kind === "RAWTEXT") {
      return token.raw.replace(
        /\r\n?|\0/g,
        (s) => {
          if (s[0] === "\r") {
            return "\n";
          } else if (s === "\0") {
            return "\uFFFD";
          } else {
            // unreachable; just in case
            return s;
          }
        }
      );
    }
    const isRCDATA = token.kind === "RCDATA";
    return token.raw.replace(
      /\r\n?|&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?|\0/g,
      (s) => {
        if (s[0] === "\r") {
          return "\n";
        } else if (s[0] === "&") {
          return evaluateCharacterReference(s);
        } else if (s === "\0") {
          return isRCDATA ? "\uFFFD" : "";
        } else {
          // unreachable; just in case
          return s;
        }
      }
    );
  } else {
    return token.value;
  }
}

export function commentValue(token: CommentTokenLike): string {
  if (token.type === "RawCommentToken") {
    const raw = token.raw;
    let part: string;
    if (raw.startsWith("<!--")) {
      if (raw.endsWith("-->")) {
        // "<!--a-->" or abruptly closed "<!--->" or "<!-->"
        part = raw.substring(4, Math.max(raw.length - 3, 4));
      } else if (raw.endsWith("--!>") && raw.length >= 8) {
        // "<!--a--!>"
        part = raw.substring(4, raw.length - 4);
      } else if (raw.length >= 6 && raw.endsWith("--")) {
        // "<!--a--", where ">" can be appended to form a complete comment
        part = raw.substring(4, raw.length - 2);
      } else if (raw.length >= 5 && raw.endsWith("-")) {
        // "<!--a-", where "->" can be appended to form a complete comment
        part = raw.substring(4, raw.length - 1);
      } else if (raw.length >= 7 && raw.endsWith("--!")) {
        // "<!--a--!", where ">" can be appended to form an invalid, yet complete comment
        part = raw.substring(4, raw.length - 3);
      } else {
        // "<!--a"
        part = raw.substring(4);
      }
    } else if (raw.startsWith("<!") || raw.startsWith("</")) {
      if (raw.endsWith(">")) {
        // "<!a>", "</%>"
        part = raw.substring(2, raw.length - 1);
      } else {
        // "<!a", "</%"
        part = raw.substring(2);
      }
    } else if (raw.endsWith(">")) {
      // "<?a>"
      part = raw.substring(1, raw.length - 1);
    } else {
      // "<?a"
      part = raw.substring(1);
    }
    return part.replace(/\r\n?|\0/, (s) => s[0] === "\r" ? "\n" : "\uFFFD");
  } else {
    return token.value;
  }
}


export function splitWhitespace(token: TextToken): [TextToken | undefined, TextToken | undefined];
export function splitWhitespace(token: RawTextToken): [RawTextToken | undefined, RawTextToken | undefined];
export function splitWhitespace(token: TextTokenLike): [TextTokenLike | undefined, TextTokenLike | undefined];
export function splitWhitespace(token: TextTokenLike): [TextTokenLike | undefined, TextTokenLike | undefined] {
  if (token.type === "RawTextToken") {
    const match = /^(?:[ \r\n\t\f]|&(?:#(?:0*(?:9|10|12|13|32)(?![0-9])|[Xx]0*(?:[9ACDacd]|20)(?![0-9a-fA-F]));?|NewLine;|Tab;))*/.exec(token.raw)!;
    if (match[0].length === 0) {
      return [undefined, token];
    } else if (match[0].length === token.raw.length) {
      return [token, undefined];
    } else {
      return [
        createRawTextToken(match[0]),
        createRawTextToken(token.raw.substring(match[0].length)),
      ];
    }
  } else {
    const match = /^[ \r\n\t\f]*/.exec(token.value)!;
    if (match[0].length === 0) {
      return [undefined, token];
    } else if (match[0].length === token.value.length) {
      return [token, undefined];
    } else {
      return [
        createTextToken(match[0]),
        createTextToken(token.value.substring(match[0].length)),
      ];
    }
  }
}

export function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrStart = /^<[a-zA-Z][^ \r\n\t\f/>]*[ \r\n\t\f/]*/.exec(raw)![0].length;
  const attrsRaw = raw.substring(attrStart, raw.length - 1);
  for (const attrMatch of attrsRaw.matchAll(/([^ \r\n\t\f/>][^ \r\n\t\f/>=]*)[ \r\n\t\f]*(?:=[ \r\n\t\f]*("[^"]*"|'[^']*'|[^ \r\n\t\f>"'][^ \r\n\t\f>]*)[ \r\n\t\f/]*|\/[ \r\n\t\f/]*|(?=[^ \r\n\t\f/>=]))?/gy)) {
    const [, name, valueRaw] = attrMatch;
    if (Object.prototype.hasOwnProperty.call(attributes, name)) continue;
    let valueBeforeEscape: string;
    if (valueRaw === undefined) {
      valueBeforeEscape = "";
    } else if (valueRaw.startsWith('"')) {
      valueBeforeEscape = valueRaw.substring(1, valueRaw.length - 1);
    } else if (valueRaw.startsWith("'")) {
      valueBeforeEscape = valueRaw.substring(1, valueRaw.length - 1);
    } else {
      valueBeforeEscape = valueRaw;
    }
    const value = valueBeforeEscape.replace(
      // Additional condition (?![a-zA-Z0-9=]) to not replace something like "foo=bar&copy=true"
      /\r\n?|&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*(?![a-zA-Z0-9=]));?|\0/g,
      (s) => {
        if (s[0] === "\r") {
          return "\n";
        } else if (s[0] === "&") {
          // Use exact=true to not replace something like "foo=bar&lts=true"
          return evaluateCharacterReference(s, true);
        } else if (s === "\0") {
          return "\uFFFD";
        } else {
          // unreachable; just in case
          return s;
        }
      }
    );
    Object.defineProperty(attributes, name, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return attributes;
}

export function normalizeTagName(s: string): string {
  if (/^[a-zA-Z0-9]+$/.test(s)) {
    return s.toLowerCase();
  } else {
    return s.replace(/[A-Z\0]/g, (c) => c === "\0" ? "\uFFFD" : c.toLowerCase());
  }
}
