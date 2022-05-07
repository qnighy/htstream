import { Action } from "./parser";
import { commentValue, textValue } from "./token";

export type Node = Document | DocumentType | Element | Text | Comment;

export type Document = {
  type: "Document";
  mode: "quirks" | "no-quirks" | "limited-quirks";
  childNodes: Node[];
};

export type DocumentType = {
  type: "DocumentType";
};

export type Element = {
  type: "Element";
  tagName: string;
  attributes: Record<string, string>;
  childNodes: Node[];
};

export type Text = {
  type: "Text";
  data: string;
};

export type Comment = {
  type: "Comment";
  data: string;
};

export class TreeBuilder {
  document: Document = {
    type: "Document",
    mode: "no-quirks",
    childNodes: []
  };
  stack: (Element | Document)[] = [this.document];
  act(action: Action) {
    switch (action.type) {
      case "DoctypeAction":
        this.document.mode = action.mode;
        if (action.token) {
          this.document.childNodes.push({
            type: "DocumentType",
          });
        }
        break;
      case "OpenAction": {
        const elem: Element = {
          type: "Element",
          tagName: action.tagName,
          attributes: {},
          childNodes: [],
        };
        this.stack[this.stack.length - 1].childNodes.push(elem);
        this.stack.push(elem);
        break;
      }
      case "CloseAction": {
        this.stack.pop();
        break;
      }
      case "NodeAction":
        switch (action.token.type) {
          case "TextToken":
          case "RawTextToken":
            this.stack[this.stack.length - 1].childNodes.push({
              type: "Text",
              data: textValue(action.token),
            });
            break;
          case "CommentToken":
          case "RawCommentToken":
            this.stack[this.stack.length - 1].childNodes.push({
              type: "Comment",
              data: commentValue(action.token),
            });
            break;
        }
        break;
      case "SkipAction":
        break;
      default:
        throw new Error(`TODO: Unknown action type: ${action.type}`);
    }
  }
}

const escapeMap = {
  "&": "&amp;",
  "\xA0": "&nbsp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function serializeDocument(node: Node, write: (chunk: string) => void) {
  switch(node.type) {
    case "Document":
      for (const child of node.childNodes) {
        serializeDocument(child, write);
      }
      break;
    case "DocumentType":
      write("<!DOCTYPE html>");
      break;
    case "Element":
      write(`<${node.tagName}>`);
      for (const child of node.childNodes) {
        serializeDocument(child, write);
      }
      write(`</${node.tagName}>`);
      break;
    case "Text":
      write(node.data.replace(/[&\xA0<>]/g, (c) => escapeMap[c as "&" | "\xA0" | "<" | ">"]))
      break;
    case "Comment":
      write("<!--");
      write(node.data);
      write("-->");
      break;
  }
}
