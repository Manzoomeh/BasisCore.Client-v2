import IContext from "../context/IContext";
import { AsyncFunction } from "../type-alias";
import IToken from "./IToken";
export default class CodeBlockToken implements IToken<any> {
  context: IContext;
  private readonly fn: Function;
  private readonly sourceNames: string[];

  constructor(expression: string, context: IContext) {
    this.context = context;
    this.fn = new AsyncFunction(
      "$bc",
      "$data",
      `try{
        ${expression}
      }catch(e){
        console.error(e);
        return e;
      }`
    );

    const r = /\$bc\.(?:waitToGetSourceAsync|tryToGetSource)\('(.*)'\)/g;
    const matches = (<any>expression).matchAll(r);
    if (matches) {
      this.sourceNames = new Array<string>();
      for (const match of matches) {
        this.sourceNames.push(match[1]);
      }
    }
  }

  public async getValueAsync(wait?: boolean): Promise<any> {
    return (await this.fn(this.context)) ?? "";
  }
  public async executeAsync(data?: any): Promise<any> {
    return (await this.fn(this.context, data)) ?? "";
  }

  public getSourceNames(): string[] {
    return this.sourceNames;
  }

  public getDefault() {
    return "";
  }
}
