import ITokenElement from "./ITokenElement";

export default class SourceTokenElement implements ITokenElement {
  source: string;
  member?: string;
  column?: string;

  constructor(parts: Array<string>) {
    this.source = parts[0];
    this.member = parts[1];
    this.column = parts.length > 2 ? parts.slice(2).join(".") : null;
  }

  get sourceName(): string {
    return `${this.source}.${this.member}`;
  }
}
