import { entityNameMaxLength, maybeInCharacterReference } from "./charref";
import { createGarbageToken, createRawCommentToken, createRawDoctypeToken, createRawEndTagToken, createRawStartTagToken, createRawTextToken, RawTextTokenKind, RawToken } from "./token";

export class Tokenizer {
  public scripting = false;
  private _state: State = "data";
  private _savedChunk: string = "";
  private _endTagName?: EndTagName | undefined = undefined;
  public addChunk(chunk: string, addToken: (token: RawToken) => void) {
    let state: State | "emitTag" = this._state;
    let savedChunk = this._savedChunk;
    let currentChunk = chunk;
    let textEnd: number | null = null;
    let i = 0;

    // script-specific state
    let scriptStateIndex = 0;
    let scriptStateSuffix = "";
    let scriptState: ScriptState = "script";
    if (this._endTagName !== undefined && (this._endTagName === "script" || this._endTagName === "script-escaped" || this._endTagName === "script-double-escaped")) {
      scriptState = this._endTagName;
      this._endTagName = "script";
      // Special case: savedChunk contains the text that is already emitted.
      // One of: "<", "<!", "<!-", "<s", "<sc", "<scr", "<scri", "<scrip", "<script", "</", "</s", "</sc", "</scr", "</scri", "</scrip", "</script", "-", and "--"
      // In the "script" state: "<!" or "<!-"
      // In the "script-escaped" state: one of "<s", "<sc", "<scr", "<scri", "<scrip", "<script", "-", and "--"
      // In the "script-double-escaped" state: one of "<", "</", "</s", "</sc", "</scr", "</scri", "</scrip", "</script", "-", and "--"
      scriptStateSuffix = savedChunk;
      if (state === "data") savedChunk = "";
    }
  outer:
    while (true) {
      switch (state) {
        case "data":
          textEnd = i;
          break;
        case "tagOpen":
          if (this._endTagName === "script") {
            [scriptState, scriptStateSuffix] = computeScriptState(scriptState, scriptStateSuffix, currentChunk.substring(scriptStateIndex, i));
            scriptStateIndex = i;
            if (scriptState === "script-double-escaped") {
              // Not a real end tag.
              state = "data";
              continue outer;
            }
          }
          break;
        case "tagName":
        case "bogusComment":
        case "endTagOpen":
          if (textEnd !== null) {
            const raw = savedChunk + currentChunk.substring(0, textEnd);
            if (raw) addToken(createRawTextToken(raw, textKind(this._endTagName)));
            savedChunk = "";
            currentChunk = currentChunk.substring(textEnd);
            i -= textEnd;
            scriptStateIndex -= textEnd;
            textEnd = null;
          }
          break;
        case "emitTag": {
          const raw = savedChunk + currentChunk.substring(0, i);
          if (/^<[a-zA-Z]/.test(raw)) {
            const tag = createRawStartTagToken(raw);
            if ((endTagNames as Set<string>).has(tag.tagName)) {
              this._endTagName = tag.tagName as EndTagName;
              if (this._endTagName === "noscript" && !this.scripting) {
                // With scripting disabled, we parse contents in <noscript>
                this._endTagName = undefined;
              } else if (this._endTagName === "script") {
                // Initialize script-specific state
                scriptStateIndex = 0; // i will be 0 later
                scriptStateSuffix = "";
                scriptState = "script";
              }
            }
            addToken(tag);
          } else if (/^<\/[a-zA-Z]/.test(raw)) {
            addToken(createRawEndTagToken(raw));
          } else if (raw.startsWith("<!--")) {
            const isCorrectEnd = raw.endsWith("-->") || (raw.endsWith("--!>") && raw.length >= 8);
            if (isCorrectEnd) {
              addToken(createRawCommentToken(raw));
            } else {
              // Not a true end of the comment. Continue parsing.
              state = "bogusComment";
              continue outer;
            }
          } else if (/^<!DOCTYPE/i.test(raw)) {
            addToken(createRawDoctypeToken(raw));
          } else if (raw.startsWith("<![CDATA[")) {
            throw new Error("TODO");
          } else if (raw === "</>") {
            addToken(createGarbageToken(raw));
          } else {
            addToken(createRawCommentToken(raw));
          }
          currentChunk = currentChunk.substring(i);
          savedChunk = "";
          i = 0;
          state = "data";
          continue outer;
        }
      }
      if (i >= currentChunk.length) break;

      if (this._endTagName) {
        // Override specific rules
        if (state === "data" && this._endTagName === "plaintext" && currentChunk[i] === "<") {
          // Entirely ignore "<" in plaintext mode
          state = "data";
          i++;
          continue;
        } else if (state === "tagOpen" && currentChunk[i] !== "/") {
          // Only allow "</"
          state = "data";
          continue;
        } else if (state === "endTagOpen" && !/[a-zA-Z]/.test(currentChunk[i])) {
          // Only alow "</something"
          state = "data";
          continue;
        } else if (state === "tagName" && /[ \r\n\t\f/>]/.test(currentChunk[i])) {
          const raw = savedChunk + currentChunk.substring(0, i);
          if (raw.substring(2).toLowerCase() === this._endTagName) {
            // Exit from the special tag
            this._endTagName = undefined;
          } else {
            state = "data";
            continue;
          }
        } else if (state === "tagName" && !/[a-zA-Z]/.test(currentChunk[i])) {
          // Invalid character like "</foo-bar". Ignore it.
          state = "data";
          continue;
        }
      }

      const transitionData: TransitionData = transitionTable[state];
      if (transitionData.selfSkip) {
        const match = transitionData.selfSkip.exec(currentChunk.substring(i));
        if (match && match[0].length > 0) {
          i += match[0].length;
          continue;
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
    if (state === "namedCharacterReference") {
      const cref = textEnd !== null ? currentChunk.substring(textEnd) : savedChunk + currentChunk.substring(0, entityNameMaxLength + 1);
      if (!maybeInCharacterReference(cref)) {
        state = "data";
        textEnd = currentChunk.length;
      }
    }
    if (this._endTagName && this._endTagName !== "title" && this._endTagName !== "textarea") {
      if (state === "characterReference" || state === "namedCharacterReference" || state === "numericCharacterReference" || state === "decimalCharacterReference" || state === "hexadecimalCharacterReference") {
        // CDATA-like state. Do not honor the character reference.
        state = "data";
        textEnd = currentChunk.length;
      }
    }
    if (this._endTagName === "script") {
      // Update state
      [scriptState, scriptStateSuffix] = computeScriptState(scriptState, scriptStateSuffix, currentChunk.substring(scriptStateIndex));
      scriptStateIndex = currentChunk.length;
    }
    if (textEnd !== null) {
      const raw = savedChunk + currentChunk.substring(0, textEnd);
      if (raw) addToken(createRawTextToken(raw, textKind(this._endTagName)));
      savedChunk = currentChunk.substring(textEnd);
    } else {
      savedChunk += currentChunk;
    }
    if (this._endTagName === "script") {
      // Save script-specific state
      this._endTagName = scriptState;
      if (state === "data") savedChunk = scriptStateSuffix;
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
        if (this._savedChunk) addToken(createRawTextToken(this._savedChunk, textKind(this._endTagName)));
        break;
      case "tagName":
      case "beforeAttributeName":
      case "attributeName":
      case "beforeAttributeValue":
      case "attributeValueDoubleQuoted":
      case "attributeValueSingleQuoted":
      case "attributeValueUnquoted":
        if (this._endTagName) {
          addToken(createRawTextToken(this._savedChunk, textKind(this._endTagName)));
        } else {
          addToken(createGarbageToken(this._savedChunk));
        }
        break;
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
      scripting: { value: this.scripting, writable: true, configurable: true, enumerable: true },
      _state: { value: this._state, writable: true, configurable: true, enumerable: true },
      _savedChunk: { value: this._savedChunk, writable: true, configurable: true, enumerable: true },
      _endTagName: { value: this._endTagName, writable: true, configurable: true, enumerable: true },
    });
  }
  equals(other: Tokenizer): boolean {
    return this.scripting === other.scripting && this._state === other._state && this._savedChunk === other._savedChunk && this._endTagName === other._endTagName;
  }
}

type EndTagName =
  // RCDATA
  | "title"
  | "textarea"
  // Special RAWTEXT
  // "<script>"
  | "script"
  // "<script>" ... "<!--"
  | "script-escaped"
  // "<script>" ... "<!--" ... "<script"
  | "script-double-escaped"
  // RAWTEXT
  | "style"
  | "xmp"
  | "iframe"
  | "noembed"
  | "noframes"
  | "noscript"
  // CDATA (like RAWTEXT)
  | "]]>"
  // PLAINTEXT
  | "plaintext";

const endTagNames = /* #__PURE__ */ new Set<EndTagName>([
  "title",
  "textarea",
  "script",
  "style",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "plaintext",
]);

type State =
  // One of:
  // - "data"
  // - "RCDATA"
  // - "RAWTEXT"
  // - "script data"
  // - "PLAINTEXT"
  // - "CDATA"
  | "data"
  // A variation of "data" just after "\r".
  | "dataCarriageReturn"
  // One of:
  // - "tagOpen"
  // - "RCDATA less-than sign"
  // - "RAWTEXT less-than sign"
  // - "script data less-than sign"
  // - "script data escaped less-than sign"
  // - "script data double escaped less-than sign"
  | "tagOpen"
  // One of:
  // - "endTagOpen"
  // - "RCDATA end tag open"
  // - "RAWTEXT end tag open"
  // - "script data end tag open"
  // - "script data escaped end tag open"
  // - "script data double escape end"
  | "endTagOpen"
  // One of:
  // - "tagName"
  // - "RCDATA end tag name"
  // - "RAWTEXT end tag name"
  // - "script data end tag name"
  // - "script data escaped end tag name"
  // - "script data double escape end"
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
    selfSkip: /^[^<&\r]+/,
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
    rules: [[null, 0, "data"]],
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
      ["?", 1, "bogusComment"],
      // Literal <
      [null, 0, "data"],
    ],
  },
  // "</" as in "</a>"
  endTagOpen: {
    rules: [
      // "</a" as in "</a>"
      [/[a-zA-Z]/, 1, "tagName"],
      // "</>" (treated as a garbage)
      [">", 1, "emitTag"],
      // "</ ... >" (bogus comment)
      [null, 1, "bogusComment"],
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
    selfSkip: /^[ \r\n\t\f]*(?:[^ \r\n\t\f<=>'"/]+=(?:"[^"]*"|'[^']*'|[^ \r\n\t\f<=>'"/]+(?=[ \r\n\t\f>]))[ \r\n\t\f]*)*/,
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
      [null, 0, "data"],
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
      [null, 0, "data"],
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

function textKind(endTagName?: EndTagName | undefined): RawTextTokenKind {
  return endTagName === undefined ? "data" :
    endTagName === "title" || endTagName === "textarea" ? "RCDATA" :
    "RAWTEXT";
}

type ScriptState = "script" | "script-escaped" | "script-double-escaped";
function computeScriptState(lastState: ScriptState, lastSuffix: string, input: string): [ScriptState, string] {
  let text = lastSuffix + input;
  let state = lastState;
  while (true) {
    switch (state) {
      case "script": {
        const match = /<!--/.exec(text);
        if (match) {
          // Retain the last "--"
          text = text.substring(match.index + 2);
          state = "script-escaped";
          break;
        } else {
          for (const suffix of ["<!-", "<!", "<"]) {
            if (text.endsWith(suffix)) return ["script", suffix];
          }
          return ["script", ""];
        }
      }
      case "script-escaped": {
        const match = /-->|<script(?=[ \r\n\t\f/>])/i.exec(text);
        if (match) {
          text = text.substring(match.index + match[0].length);
          state = match[0] === "-->" ? "script" : "script-double-escaped";
          break;
        } else {
          const re = /(?:-->|--?|<(?:s(?:c(?:r(?:i(?:p(?:t)?)?)?)?)?)?)$/g;
          re.lastIndex = text.length - 7; // Longest suffix is "<script"
          const match = re.exec(text);
          return ["script-escaped", match?.[0] ?? ""];
        }
      }
      case "script-double-escaped": {
        const match = /-->|<\/script(?=[ \r\n\t\f/>])/i.exec(text);
        if (match) {
          text = text.substring(match.index + match[0].length);
          state = match[0] === "-->" ? "script" : "script-escaped";
          break;
        } else {
          const re = /(?:-->|--?|<(?:\/(?:s(?:c(?:r(?:i(?:p(?:t)?)?)?)?)?)?)?)$/g;
          re.lastIndex = text.length - 8; // Longest suffix is "</script"
          const match = re.exec(text);
          return ["script-double-escaped", match?.[0] ?? ""];
        }
      }
    }
  }
}
