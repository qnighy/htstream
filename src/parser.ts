import { Token } from "./token";
export class TokenParser {
  private _mode: InsertionMode = "initial";
  public addToken(token: Token, addParsedToken: (token: Token) => void) {
    addParsedToken(token);
  }
  public finish(_addParsedToken: (token: Token) => void) {
    // TODO
  }
}

type InsertionMode =
  | "initial";
