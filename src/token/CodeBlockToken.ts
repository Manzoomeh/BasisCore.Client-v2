import IContext from "../context/IContext";
import { AsyncFunction } from "../type-alias";
import IToken from "./IToken";
export default class CodeBlockToken implements IToken<any> {
  context: IContext;
  private readonly content: string;
  private readonly fn: Function;
  private readonly data?: any;

  constructor(content: string, context: IContext, data?: any) {
    this.content = content;
    this.context = context;
    this.data = data;
    this.fn = new AsyncFunction(
      "$bc",
      "$data",
      `try{
        ${this.content}
      }catch(e){
        console.error(e);
        return e;
      }`
    );
    console.log("bt");
  }

  public async getValueAsync(wait?: boolean): Promise<any> {
    return (await this.fn(this.context, this.data)) ?? "";
  }

  public getSourceNames(): string[] {
    return null;
  }

  public getDefault() {
    throw new Error("Method not implemented.");
  }
}
