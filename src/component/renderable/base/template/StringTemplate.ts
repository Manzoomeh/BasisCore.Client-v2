import ITemplate from "./ITemplate";

export class StringTemplate implements ITemplate<string> {
  readonly content: string;
  constructor(content: string) {
    this.content = content;
  }
  getValueAsync(_: any): Promise<string> {
    return Promise.resolve(this.content);
  }
}
