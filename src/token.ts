import { evaluateCharacterReference } from "./charref";

export type Token =
  | TextToken
  | RawTextToken
  | StartTagToken
  | RawStartTagToken
  | EndTagToken
  | RawEndTagToken
  | DoctypeToken
  | RawDoctypeToken;
export type RawToken =
  | RawTextToken
  | RawStartTagToken
  | RawEndTagToken
  | RawDoctypeToken;
export type TextTokenLike = TextToken | RawTextToken;
export type StartTagTokenLike = StartTagToken | RawStartTagToken;
export type EndTagTokenLike = EndTagToken | RawEndTagToken;
export type DoctypeTokenLike = DoctypeToken | RawDoctypeToken;

export type TextToken = {
  type: "TextToken";
  value: string;
};

export type RawTextToken = {
  type: "RawTextToken";
  raw: string;
};

export type StartTagToken = {
  type: "StartTagToken";
  tagName: string;
  // attributes: Attribute[];
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

export function createTextToken(value: string): TextToken {
  return {
    type: "TextToken",
    value,
  };
}

export function createRawTextToken(raw: string): RawTextToken {
  return {
    type: "RawTextToken",
    raw,
  };
}

export function createStartTagToken(tagName: string): StartTagToken {
  return {
    type: "StartTagToken",
    tagName: normalizeTagName(tagName),
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

export function textValue(token: TextTokenLike): string {
  if (token.type === "RawTextToken") {
    return token.raw.replace(
      /\r\n?|&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g,
      (s) => {
        if (s[0] === "\r") {
          return "\n";
        } else if (s[0] === "&") {
          return evaluateCharacterReference(s);
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

export function normalizeTagName(s: string): string {
  if (/^[a-zA-Z0-9]+$/.test(s)) {
    return s.toLowerCase();
  } else {
    return s.replace(/[A-Z\0]/g, (c) => c === "\0" ? "\uFFFD" : c.toLowerCase());
  }
}
