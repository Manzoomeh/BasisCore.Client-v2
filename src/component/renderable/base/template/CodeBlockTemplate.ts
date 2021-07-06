import IContext from "../../../../context/IContext";
import CodeBlockToken from "../../../../token/CodeBlockToken";
import ITemplate from "./ITemplate";

export default class CodeBlockTemplate implements ITemplate {
  private readonly token: CodeBlockToken;

  constructor(expression: string, context: IContext) {
    this.token = new CodeBlockToken(expression, context);
  }

  async getValueAsync(data: any): Promise<string> {
    const result = await this.token.executeAsync(data);
    return typeof result !== "string" ? `${result}` : result;
  }
}
