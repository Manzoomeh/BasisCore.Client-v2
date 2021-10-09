import IContext from "../../../../context/IContext";
import CodeBlockToken from "../../../../token/CodeBlockToken";
import ITemplate from "./ITemplate";

export default class CodeBlockTemplate implements ITemplate<any> {
  private readonly token: CodeBlockToken;

  constructor(expression: string, context: IContext) {
    this.token = new CodeBlockToken(expression, context);
  }

  async getValueAsync(data: any): Promise<any> {
    return await this.token.executeAsync(data);
  }
}
