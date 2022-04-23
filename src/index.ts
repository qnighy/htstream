import type { Token } from "./token";
import { TextToken, StartTagToken, EndTagToken } from "./token";

export type { Token } from "./token";
export { TextToken, StartTagToken, EndTagToken } from "./token";
export type ParseError = "invalid-first-character-of-tag-name";
type State =
  | "data"
  | "tagOpen"
  | "endTagOpen"
  | "tagName"
  | "beforeAttributeName"
  | "attributeName"
  | "beforeAttributeValue"
  | "attributeValueDoubleQuoted"
  | "attributeValueSingleQuoted"
  | "attributeValueUnquoted";

export class Tokenizer {
  private _state: State = "data";
  private _savedChunk: string = "";
  public addChunk(chunk: string, addToken: (token: Token) => void, _handleError: (error: ParseError) => void) {
    let currentChunk = chunk;
    let i = 0;
  consumeLoop:
    while (i < currentChunk.length) {
      switch (this._state) {
        case "data": {
          // Here we have i === 0
          i = /^[^<&]*/.exec(currentChunk)![0].length;
          while (i < currentChunk.length) {
            // Expand text token to include :
            // - known-invalid taglike (<)
            // - known-invalid character reference-like (&foo, &foo;)
            if (currentChunk[i] === "<") {
              if (i + 1 < currentChunk.length && /[^a-zA-Z/!?]/.test(currentChunk[i + 1])) {
                i++;
              } else {
                // Unsure if its valid
                break;
              }
            } else if (currentChunk[i] === "&") {
              throw new Error("TODO");
            }
            i += /^[^<&]*/.exec(currentChunk.substring(i))![0].length;
          }
          if (0 < i) {
            // savedChunk is empty here
            addToken(TextToken.createRawToken(currentChunk.substring(0, i)));
          }
          currentChunk = currentChunk.substring(i);
          i = 0;
          if (0 < currentChunk.length) {
            if (currentChunk[0] === "<") {
              this._state = "tagOpen";
              i++;
            } else {
              throw new Error("TODO");
            }
          }
          break;
        }
        case "tagOpen": {
          if (currentChunk[i] === "/") {
            // </foo>
            i++;
            this._state = "endTagOpen";
          } else if (/[a-zA-Z]/.test(currentChunk[i])) {
            // <foo>
            this._state = "tagName";
          } else if (currentChunk[i] === "!") {
            // <!-- -->, <!doctype>, etc.
            throw new Error("TODO");
          } else if (currentChunk[i] === "?") {
            // Invalid token like <?xml>
            throw new Error("TODO");
          } else {
            // Fallback to plain <
            // We have i === 0 here
            throw new Error("TODO");
          }
          break;
        }
        case "endTagOpen": {
          if (/[a-zA-Z]/.test(currentChunk[i])) {
            // </foo>
            this._state = "tagName";
          } else if (currentChunk[i] === ">") {
            // Invalid </>, skipped as a bogus tag
            throw new Error("TODO");
          } else {
            // Invalid </, interpreted as a bogus comment
            throw new Error("TODO");
          }
          break;
        }
        case "tagName": {
          const match = /[ \r\n\t\f/>]/.exec(currentChunk.substring(i));
          if (match) {
            if (match[0] === ">") {
              // <foo>
              i += match.index + 1;
              const raw = this._savedChunk + currentChunk.substring(0, i);
              addToken(raw.startsWith("</") ? EndTagToken.createRawToken(raw) : StartTagToken.createRawToken(raw));
              this._savedChunk = "";
              currentChunk = currentChunk.substring(i);
              i = 0;
              this._state = "data";
            } else {
              i += match.index + 1;
              this._state = "beforeAttributeName";
            }
          } else {
            break consumeLoop;
          }
          break;
        }
        // "before attribute name", "self-closing start tag", "after attribute value (quoted)"
        // They are actually equivalent in terms of detecting the end of the tag
        case "beforeAttributeName": {
          // Here we have a trick: where `foo bar=42` has two attributes, we regard them as one.
          // Concatenation happens if the former attribute does not have a value.
          // /
          //   # Skip whitespace before the attribute but `/` is treated the same whether it's part of `/>` or not (i.e. invalid occurrence of /)
          //   ^[ \r\n\t\f/]*
          //   # Repeat greedily to process all attributes
          //   (?:
          //     # An invalid equal sign can come here as part of the attribute name
          //     [^ \r\n\t\f/>]
          //     # No equal sign after the 2nd character.
          //     # We regard whitespace as part of the attribute name here
          //     [^/>=]*
          //     (?:
          //       # Slash here resets the state (i.e. we can use = again)
          //       /
          //       # Attribute value follows
          //       | =
          //         [ \r\n\t\f]*
          //         (?:
          //           # Quoted
          //           "[^"]*"
          //           | '[^']*'
          //           # Unquoted
          //           | [^ \r\n\t\f>"'][^ \r\n\t\f>]*(?=[ \r\n\t\f>])
          //           # Or immediate exit
          //           | (?=>)
          //         )
          //       # Or immediate exit
          //       | (?=>)
          //     )
          //     # Skip whitespace before the attribute as in the first step
          //     [ \r\n\t\f/]*
          //   )*
          //   # Closing token
          //   (>?)
          // /
          const re = /^[ \r\n\t\f/]*(?:[^ \r\n\t\f/>][^/>=]*(?:\/|=[ \r\n\t\f]*(?:"[^"]*"|'[^']*'|[^ \r\n\t\f>"'][^ \r\n\t\f>]*(?=[ \r\n\t\f>])|(?=>))|(?=>))[ \r\n\t\f/]*)*(>?)/;
          const match = re.exec(currentChunk.substring(i))!;
          if (match[1].length > 0) {
            // Full tag
            i += match[0].length;
            const raw = this._savedChunk + currentChunk.substring(0, i);
            addToken(raw.startsWith("</") ? EndTagToken.createRawToken(raw) : StartTagToken.createRawToken(raw));
            this._savedChunk = "";
            currentChunk = currentChunk.substring(i);
            i = 0;
            this._state = "data";
          } else {
            // Partial tag; this addition doesn't change the state
            i += match[0].length;
            // Progress state machine one-by-one
            if (i < currentChunk.length) {
              this._state = "attributeName";
              i += /^[^ \r\n\t\f/>][^/>=]*/.exec(currentChunk.substring(i))![0].length;
            }
          }
          break;
        }
        case "attributeName":
          i += /^[^/>=]*/.exec(currentChunk.substring(i))![0].length;
          if (i < currentChunk.length) {
            if (currentChunk[i] === "=") {
              this._state = "beforeAttributeValue";
              i++;
            } else {
              this._state = "beforeAttributeName";
            }
          }
          break;
        case "beforeAttributeValue":
          i += /^[ \r\n\t\f]*/.exec(currentChunk.substring(i))![0].length;
          if (i < currentChunk.length) {
            if (currentChunk[i] === "\"") {
              this._state = "attributeValueDoubleQuoted";
              i++;
            } else if (currentChunk[i] === "'") {
              this._state = "attributeValueSingleQuoted";
              i++;
            } else if (currentChunk[i] === ">") {
              this._state = "beforeAttributeName";
            } else {
              this._state = "attributeValueUnquoted";
            }
          }
          break;
        case "attributeValueDoubleQuoted":
          i += /^[^"]*/.exec(currentChunk.substring(i))![0].length;
          if (i < currentChunk.length) {
            this._state = "beforeAttributeName";
            i++;
          }
          break;
        case "attributeValueSingleQuoted":
          i += /^[^']*/.exec(currentChunk.substring(i))![0].length;
          if (i < currentChunk.length) {
            this._state = "beforeAttributeName";
            i++;
          }
          break;
        case "attributeValueUnquoted":
          i += /^[^ \r\n\t\f>]*/.exec(currentChunk.substring(i))![0].length;
          if (i < currentChunk.length) {
            this._state = "beforeAttributeName";
          }
          break;
        default: {
          const state: never = this._state;
          throw new Error(`Unexpected state: ${state}`);
        }
      }
    }
    this._savedChunk += currentChunk;
  }
}
