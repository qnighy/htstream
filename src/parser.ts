import { CommentTokenLike, DoctypeTokenLike, EndTagTokenLike, StartTagTokenLike, TextTokenLike, Token } from "./token";

export type Action = DoctypeAction | OpenAction | CloseAction | MergeAction | NodeAction | SkipAction;
export type DoctypeAction = {
  type: "DoctypeAction";
  mode: "quirks" | "no-quirks" | "limited-quirks";
  token?: DoctypeTokenLike;
};
export type OpenAction = OrdinaryOpenAction | BrOpenAction;
export type OrdinaryOpenAction = {
  type: "OpenAction";
  tagName: string;
  token?: StartTagTokenLike;
};
export type BrOpenAction = {
  type: "OpenAction";
  tagName: "br";
  token: EndTagTokenLike;
};
export type CloseAction = {
  type: "CloseAction";
  tagName: string;
  token?: EndTagTokenLike;
};
export type MergeAction = {
  type: "MergeAction";
  tagName: "html" | "body";
  token: StartTagTokenLike;
};
export type NodeAction = {
  type: "NodeAction";
  token: TextTokenLike | CommentTokenLike;
};
export type SkipAction = {
  type: "SkipAction";
  token: Token;
};
export class TokenParser {
  stack: string[] = [];
  public addToken(token: Token, actor: (action: Action) => void) {
    switch (token.type) {
      case "DoctypeToken":
      case "RawDoctypeToken":
        actor({
          type: "DoctypeAction",
          mode: "no-quirks", // TODO
          token,
        });
        break;
      case "StartTagToken":
      case "RawStartTagToken":
        this.stack.push(token.tagName);
        actor({
          type: "OpenAction",
          tagName: token.tagName,
          token,
        });
        break;
      case "EndTagToken":
      case "RawEndTagToken": {
        const matchingIndex = this.stack.lastIndexOf(token.tagName);
        if (matchingIndex === -1) {
          actor({
            type: "SkipAction",
            token,
          });
        } else {
          while (this.stack.length > matchingIndex + 1) {
            const tagName = this.stack.pop()!;
            actor({
              type: "CloseAction",
              tagName,
            });
          }
          this.stack.pop();
          actor({
            type: "CloseAction",
            tagName: token.tagName,
            token,
          });
        }
        break;
      }
      case "CommentToken":
      case "RawCommentToken":
      case "TextToken":
      case "RawTextToken":
        actor({
          type: "NodeAction",
          token,
        });
        break;
      case "GarbageToken":
        actor({
          type: "SkipAction",
          token,
        });
        break;
    }
  }
  public finish(actor: (token: Action) => void) {
    while (this.stack.length > 0) {
      const tagName = this.stack.pop()!;
      actor({
        type: "CloseAction",
        tagName,
      });
    }
  }
}
