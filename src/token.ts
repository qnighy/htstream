import { evaluateCharacterReference } from "./charref";

export type Token = TextToken | StartTagToken | EndTagToken;

export class TextToken {
  declare type: "Text";
  static {
    this.prototype.type = "Text";
  }

  private _value?: string;
  private _raw?: string;
  // One of the following, if any:
  // - Possible partial CRLF, that is: "\r"
  // - Possible partial tag, that is: "<"
  // - Possible partial character reference. For example: "&", "&am".
  private _ambiguousSuffix?: string;
  constructor(value: string) {
    this._value = value;
  }
  public static createRawToken(raw: string, ambiguousSuffix?: string): TextToken {
    const token: TextToken = Object.create(TextToken.prototype);
    token._value = undefined;
    token._raw = raw;
    token._ambiguousSuffix = ambiguousSuffix;
    return token;
  }
  public get value(): string {
    if (typeof this._value === "string") {
      return this._value;
    } else {
      const value = this._raw!.replace(
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
      return this._value = value;
    }
  }
  public get raw(): string | undefined {
    return this._raw;
  }
}

export class StartTagToken {
  declare type: "StartTag";
  static {
    this.prototype.type = "StartTag";
  }

  readonly name: string;
  private _raw?: string;
  constructor(name: string) {
    this.name = normalizeTagName(name);
  }
  public static createRawToken(raw: string): StartTagToken {
    const name = normalizeTagName(/^<([a-zA-Z][^ \r\n\t\f/>]*)/.exec(raw)?.[1] ?? "");
    const token: StartTagToken = Object.create(StartTagToken.prototype);
    (token as { name: string }).name = name;
    token._raw = raw;
    return token;
  }
  public get raw(): string | undefined {
    return this._raw;
  }
}

export class EndTagToken {
  declare type: "EndTag";
  static {
    this.prototype.type = "EndTag";
  }

  readonly name: string;
  private _raw?: string;
  constructor(name: string) {
    this.name = normalizeTagName(name);
  }
  public static createRawToken(raw: string): EndTagToken {
    const name = normalizeTagName(/^<\/([a-zA-Z][^ \r\n\t\f/>]*)/.exec(raw)?.[1] ?? "");
    const token: EndTagToken = Object.create(EndTagToken.prototype);
    (token as { name: string }).name = name;
    token._raw = raw;
    return token;
  }
  public get raw(): string | undefined {
    return this._raw;
  }
}

export function normalizeTagName(s: string): string {
  if (/^[a-zA-Z0-9]+$/.test(s)) {
    return s.toLowerCase();
  } else {
    return s.replace(/[A-Z\0]/g, (c) => c === "\0" ? "\uFFFD" : c.toLowerCase());
  }
}
