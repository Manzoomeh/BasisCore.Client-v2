import ITemplate from "./ITemplate";
import { ExpressionTemplate } from "./ExpressionTemplate";
import { StringTemplate } from "./StringTemplate";
import IContext from "../../../../context/IContext";
import CodeBlockTemplate from "./CodeBlockTemplate";

export default class ContentTemplate implements ITemplate<any> {
  private contents: Array<ITemplate<any>> = new Array<ITemplate<any>>();
  private readonly template: string;
  private readonly context: IContext;
  private readonly reservedKeys: Array<string>;
  constructor(
    context: IContext,
    template: string,
    reservedKeys: Array<string>
  ) {
    this.context = context;
    this.template = template;
    this.reservedKeys = reservedKeys;
    if (template) {
      this.extractContents();
    }
  }

  private extractContents() {
    const faceRegex =
      this.context.options.getDefault<RegExp>("binding.face-regex");
    const blockRegex = this.context.options.getDefault<RegExp>(
      "binding.codeblock-regex"
    );
    const pattern = new RegExp(
      `${faceRegex.source}|${blockRegex.source}`,
      "gi"
    );
    let matchResult;
    let startIndex = 0;
    while ((matchResult = pattern.exec(this.template)) !== null) {
      const finding = matchResult[0];
      const preChar = matchResult[1];
      const index = matchResult.index + (preChar?.length ?? 0);
      if (startIndex != index) {
        this.contents.push(
          new StringTemplate(this.template.slice(startIndex, index))
        );
      }
      startIndex = index + finding.length;
      const expression = matchResult[2] ?? matchResult[3];
      const originalExpression = (matchResult[0] as string)?.substr(1);
      if (expression) {
        this.contents.push(
          new ExpressionTemplate(
            expression,
            originalExpression,
            this.reservedKeys
          )
        );
        startIndex -= preChar?.length ?? 0;
      } else {
        const blockToken = matchResult[4];
        this.contents.push(new CodeBlockTemplate(blockToken, this.context));
      }
    }
    if (startIndex != this.template.length) {
      this.contents.push(new StringTemplate(this.template.slice(startIndex)));
    }
  }

  public async getValueAsync(data: any): Promise<string> {
    const tasks = this.contents.map((x) => x.getValueAsync(data));
    const result = await Promise.all(tasks);
    return result.reduce((r, v) => (r += v), "");
  }
}
