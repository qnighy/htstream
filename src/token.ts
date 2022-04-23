import { evaluateCharacterReference } from "./charref";

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
    const token = Object.create(TextToken.prototype);
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
}
