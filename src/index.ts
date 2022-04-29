import { maybeInCharacterReference } from "./charref";
import { createRawCommentToken, createRawDoctypeToken, createRawEndTagToken, createRawStartTagToken, createRawTextToken, RawToken } from "./token";

export type {
  Token,
  RawToken,
  TextTokenLike,
  StartTagTokenLike,
  EndTagTokenLike,
  TextToken,
  RawTextToken,
  StartTagToken,
  RawStartTagToken,
  EndTagToken,
  RawEndTagToken,
} from "./token";

export class Tokenizer {
  private _state: State = "data";
  private _savedChunk: string = "";
  public addChunk(chunk: string, addToken: (token: RawToken) => void) {
    let state: State | "emitTag" = this._state;
    let savedChunk = this._savedChunk;
    let currentChunk = chunk;
    let textEnd: number | null = null;
    let i = 0;
  outer:
    while (true) {
      switch (state) {
        case "data":
          textEnd = i;
          break;
        case "tagName":
          if (textEnd !== null) {
            const raw = savedChunk + currentChunk.substring(0, textEnd);
            if (raw) addToken(createRawTextToken(savedChunk + currentChunk.substring(0, textEnd)));
            savedChunk = "";
            currentChunk = currentChunk.substring(textEnd);
            i -= textEnd;
            textEnd = null;
          }
          break;
        case "emitTag": {
          const raw = savedChunk + currentChunk.substring(0, i);
          currentChunk = currentChunk.substring(i);
          savedChunk = "";
          i = 0;
          if (/^<[a-zA-Z]/.test(raw)) {
            addToken(createRawStartTagToken(raw));
          } else if (raw.startsWith("</")) {
            addToken(createRawEndTagToken(raw));
          } else if (raw.startsWith("<!")) {
            if (raw.startsWith("<!--")) {
              throw new Error("TODO");
            } else if (/^<!DOCTYPE/i.test(raw)) {
              addToken(createRawDoctypeToken(raw));
            } else if (raw.startsWith("<![CDATA[")) {
              throw new Error("TODO");
            } else {
              throw new Error("TODO");
            }
          } else {
            throw new Error("TODO");
          }
          state = "data";
          continue outer;
        }
      }
      if (i >= currentChunk.length) break;

      const transitionData: TransitionData = transitionTable[state];
      if (transitionData.selfSkip) {
        const match = transitionData.selfSkip.exec(currentChunk.substring(i));
        if (match) {
          i += match[0].length;
          if (i < currentChunk.length) break;
        }
      }
      const ch = currentChunk[i];
      for (const rule of transitionData.rules) {
        if (
          (typeof rule[0] === "string" && rule[0] !== ch) ||
          (rule[0] instanceof RegExp && !rule[0].test(ch))
        ) continue;
        if (rule[2] === "TODO") {
          throw new Error(`TODO: ${state}, ch = ${JSON.stringify(ch)}`);
        }
        state = rule[2];
        i += rule[1];
        continue outer;
      }
      throw new Error("unreachable");
    }
    if (textEnd !== null) {
      const raw = savedChunk + currentChunk.substring(0, textEnd);
      if (raw) addToken(createRawTextToken(savedChunk + currentChunk.substring(0, textEnd)));
      savedChunk = currentChunk.substring(textEnd);
    } else {
      savedChunk += currentChunk;
    }
    this._state = state;
    this._savedChunk = savedChunk;
  }
  public finish(addToken: (token: RawToken) => void) {
    switch (this._state) {
      case "data":
      case "dataCarriageReturn":
      case "tagOpen":
      case "endTagOpen":
      case "characterReference":
      case "namedCharacterReference":
      case "numericCharacterReference":
      case "hexadecimalCharacterReference":
      case "decimalCharacterReference":
        if (this._savedChunk) addToken(createRawTextToken(this._savedChunk));
        break;
      case "tagName":
      case "beforeAttributeName":
      case "attributeName":
      case "beforeAttributeValue":
      case "attributeValueDoubleQuoted":
      case "attributeValueSingleQuoted":
      case "attributeValueUnquoted":
      case "bogusComment":
        if (/^<!doctype/i.test(this._savedChunk)) {
          addToken(createRawDoctypeToken(this._savedChunk));
        } else if (this._savedChunk) {
          addToken(createRawCommentToken(this._savedChunk));
        }
        break;
      default: {
        const state: never = this._state;
        throw new Error(`Invalid state ${state}`);
      }
    }
    this._state = "data";
    this._savedChunk = "";
  }
  clone(): Tokenizer {
    return Object.create(Tokenizer.prototype, {
      _state: { value: this._state, writable: true, configurable: true, enumerable: true },
      _savedChunk: { value: this._savedChunk, writable: true, configurable: true, enumerable: true },
    });
  }
  equals(other: Tokenizer): boolean {
    return this._state === other._state && this._savedChunk === other._savedChunk;
  }
}

type State =
  | "data"
  | "dataCarriageReturn"
  | "tagOpen"
  | "endTagOpen"
  | "tagName"
  // One of:
  // - "before attribute name"
  // - "self-closing start tag"
  // - "after attribute value (quoted)"
  | "beforeAttributeName"
  // "attribute name" or "after attribute name"
  | "attributeName"
  | "beforeAttributeValue"
  | "attributeValueDoubleQuoted"
  | "attributeValueSingleQuoted"
  | "attributeValueUnquoted"
  // One of:
  // - "bogus comment"
  // - "markup declaration open"
  // - "comment start"
  // - "comment start dash"
  // - "comment"
  // - "comment less-than sign"
  // - "comment less-than sign bang"
  // - "comment less-than sign bang dash"
  // - "comment less-than sign bang dash dash"
  // - "comment end dash"
  // - "comment end"
  // - "comment end bang"
  // - "DOCTYPE"
  // - "before DOCTYPE name"
  // - "DOCTYPE name"
  // - "after DOCTYPE name"
  // - "after DOCTYPE public keyword"
  // - "before DOCTYPE public identifier"
  // - "DOCTYPE public identifier double-quoted"
  // - "DOCTYPE public identifier single-quoted"
  // - "after DOCTYPE public identifier"
  // - "between DOCTYPE public and system identifiers"
  // - "after DOCTYPE system keyword"
  // - "before DOCTYPE system identifier"
  // - "DOCTYPE system identifier double-quoted"
  // - "DOCTYPE system identifier single-quoted"
  // - "after DOCTYPE system identifier"
  // - "bogus DOCTYPE"
  // - "CDATA section"
  // - "CDATA section bracket"
  // - "CDATA section end"
  //
  // Comments and CDATAs have different conditions for termination.
  // This is handled specially in the main tokenization loop.
  | "bogusComment"
  // Only if the return state is "data" or "RCDATA".
  | "characterReference"
  | "namedCharacterReference"
  // Includes the "decimal character reference start" state
  | "numericCharacterReference"
  // Either "hexadecimal character reference start" or "hexadecimal character reference"
  | "hexadecimalCharacterReference"
  | "decimalCharacterReference";

type TransitionData = {
  selfSkip?: RegExp;
  rules: [string | RegExp | null, 0 | 1, State | "emitTag" | "TODO"][];
};

const transitionTable: Record<State, TransitionData> = {
  data: {
    rules: [
      // "&" as in "&amp;"
      ["&", 1, "characterReference"],
      // "<" as in "<a>", "</a>", "<!-->", "<!doctype>", "<![CDATA[]]>"
      ["<", 1, "tagOpen"],
      // Maybe a part of CRLF
      ["\r", 1, "dataCarriageReturn"],
      [null, 1, "data"],
    ],
  },
  // Continuation from "\r", always goes back to data
  dataCarriageReturn: {
    rules: [[null, 1, "data"]],
  },
  // "<" as in "<a>", "</a>", "<!-->", "<!doctype>", "<![CDATA[]]>"
  tagOpen: {
    rules: [
      // "<a" as in "<a>"
      [/[a-zA-Z]/, 1, "tagName"],
      // "</" as in "</a>"
      ["/", 1, "endTagOpen"],
      // "<!" as in "<!-->", "<!doctype>", "<![CDATA[]]>"
      ["!", 1, "bogusComment"],
      // "<?" as in "<?xml?>" (bogus comment)
      ["?", 1, "TODO"],
      // Literal <
      [null, 1, "data"],
    ],
  },
  // "</" as in "</a>"
  endTagOpen: {
    rules: [
      // "</a" as in "</a>"
      [/[a-zA-Z]/, 1, "tagName"],
      // "</>" (bogus comment)
      [">", 1, "TODO"],
      // "</ ... >" (bogus comment)
      [null, 1, "TODO"],
    ],
  },
  // "<a" as in "<a>"
  tagName: {
    rules: [
      // "<a>"
      [">", 1, "emitTag"],
      // "<a " as in "<a foo=bar>"
      [/[ \r\n\t\f/]/, 1, "beforeAttributeName"],
      [null, 1, "tagName"],
    ],
  },
  // "before attribute name":
  //   "<a " as in "<a foo=bar>"
  // "self-closing start tag":
  //   "<a/" as in "<a/>"
  // "after attribute value (quoted)":
  //   "<a foo=\"bar\"" as in "<a foo=\"bar\" baz>"
  beforeAttributeName: {
    rules: [
      [/[ \r\n\t\f/]/, 1, "beforeAttributeName"],
      // "<a >"
      [">", 1, "emitTag"],
      // "<a f" as in "<a foo=bar>"
      [null, 1, "attributeName"],
    ],
  },
  // "attribute name":
  //   "<a f" as in "<a foo=bar>"
  // "after attribute name":
  //   "<a foo " as in "<a foo = bar>"
  attributeName: {
    rules: [
      // "<a foo=" as in "<a foo=bar>"
      ["=", 1, "beforeAttributeValue"],
      // "<a foo>"
      [">", 1, "emitTag"],
      // "<a foo/" as in "<a foo/>"
      ["/", 1, "beforeAttributeName"],
      [null, 1, "attributeName"],
    ],
  },
  // "<a foo=" as in "<a foo=bar>"
  beforeAttributeValue: {
    rules: [
      // "<a foo=\"" as in "<a foo=\"bar\">"
      ["\"", 1, "attributeValueDoubleQuoted"],
      // "<a foo='" as in "<a foo='bar'>"
      ["'", 1, "attributeValueSingleQuoted"],
      [/[ \r\n\t\f]/, 1, "beforeAttributeValue"],
      // "<a foo=>"
      [">", 1, "emitTag"],
      // "<a foo=b" as in "<a foo=bar>"
      [null, 1, "attributeValueUnquoted"],
    ],
  },
  // "<a foo=\"" as in "<a foo=\"bar\">"
  attributeValueDoubleQuoted: {
    rules: [
      // "<a foo=\"bar\"" as in "<a foo=\"bar\">"
      ["\"", 1, "beforeAttributeName"],
      [null, 1, "attributeValueDoubleQuoted"],
    ],
  },
  // "<a foo='" as in "<a foo='bar'>"
  attributeValueSingleQuoted: {
    rules: [
      // "<a foo='bar'" as in "<a foo='bar'>"
      ["'", 1, "beforeAttributeName"],
      [null, 1, "attributeValueSingleQuoted"],
    ],
  },
  attributeValueUnquoted: {
    rules: [
      // "<a foo=bar>"
      [">", 1, "emitTag"],
      // "<a foo=bar " as in "<a foo=bar baz>"
      [/[ \r\n\t\f]/, 1, "beforeAttributeName"],
      [null, 1, "attributeValueUnquoted"],
    ],
  },
  // "<!" as in "<!-->", "<!doctype>", "<![CDATA[]]>"
  bogusComment: {
    rules: [
      // Comments and CDATAs have different conditions for termination.
      // This is handled specially in the main tokenization loop.
      [">", 1, "emitTag"],
      [null, 1, "bogusComment"],
    ],
  },
  // "&" as in "&amp;"
  characterReference: {
    rules: [
      // "&a" as in "&amp;"
      [/[a-zA-Z]/, 1, "namedCharacterReference"],
      // "&#" as in "&#38;", "&#x26;"
      ["#", 1, "numericCharacterReference"],
      [null, 1, "TODO"],
    ],
  },
  // "&a" as in "&amp;"
  // TODO: handle known-invalid cases
  namedCharacterReference: {
    rules: [
      [/[a-zA-Z0-9]/, 1, "namedCharacterReference"],
      // "&amp;" or "&amp" as in "&amp ". Consumable in any case.
      [null, 0, "data"],
    ],
  },
  // "&#" as in "&#38;", "&#x26;"
  numericCharacterReference: {
    rules: [
      // "&#x" as in "&#x26"
      [/[xX]/, 1, "hexadecimalCharacterReference"],
      // "&#3" as in "&#38;"
      [/[0-9]/, 1, "decimalCharacterReference"],
      [null, 0, "TODO"],
    ],
  },
  // "&#x" or "&#x2" as in "&#x26;"
  hexadecimalCharacterReference: {
    rules: [
      [/[0-9a-fA-F]/, 1, "hexadecimalCharacterReference"],
      // "&#x", "&#x2" or "&#x26" as in "&#x26;". Consumable in any case.
      [null, 0, "data"],
    ],
  },
  // "&#3" as in "&#38;"
  decimalCharacterReference: {
    rules: [
      [/[0-9]/, 1, "decimalCharacterReference"],
      // "&#3" or "&#38" as in "&#38;". Consumable in any case.
      [null, 0, "data"],
    ],
  },
};
