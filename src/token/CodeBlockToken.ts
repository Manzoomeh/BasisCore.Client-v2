import IContext from "../context/IContext";
import { AsyncFunction } from "../type-alias";
import IToken from "./IToken";
export default class CodeBlockToken implements IToken<any> {
  context: IContext;
  private readonly fn: Function;

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
  }

  public async getValueAsync(wait?: boolean): Promise<any> {
    return (await this.fn(this.context)) ?? "";
  }
  public async executeAsync(data?: any): Promise<any> {
    return (await this.fn(this.context, data)) ?? "";
  }

  public getSourceNames(): string[] {
    return null;
  }

  public getDefault() {
    throw new Error("Method not implemented.");
  }
}
