import ITemplate from "./ITemplate";

export class StringTemplate implements ITemplate {
  readonly content: string;
  constructor(content: string) {
    this.content = content;
  }
  getValueAsync(_: any): Promise<string> {
    return Promise.resolve(this.content);
  }
}
