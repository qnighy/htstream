export type Token = TextToken | StartTagToken | EndTagToken;
export type TextToken = {
  type: "Text";
  raw: string;
};
export type StartTagToken = {
  type: "StartTag";
  raw: string;
};
export type EndTagToken = {
  type: "EndTag";
  raw: string;
};
export type ParseError = "invalid-first-character-of-tag-name";
type State = "data" | "tagOpen" | "endTagOpen" | "tagName" | "beforeAttributeName" | "attributeName";

export class Tokenizer {
  private _state: State = "data";
  private _savedChunk: string = "";
  public addChunk(chunk: string, addToken: (token: Token) => void, handleError: (error: ParseError) => void) {
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
            addToken({
              type: "Text",
              // savedChunk is empty here
              raw: currentChunk.substring(0, i),
            });
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
              i += match.index + 1;
              const raw = this._savedChunk + currentChunk.substring(0, i);
              addToken({
                type: raw.startsWith("</") ? "EndTag" : "StartTag",
                raw,
              });
              this._savedChunk = "";
              currentChunk = currentChunk.substring(i);
              i = 0;
              this._state = "data";
            } else {
              throw new Error("TODO");
            }
          } else {
            break consumeLoop;
          }
          break;
        }
      }
    }
    this._savedChunk += currentChunk;
  }
}
