import ITemplate from "./ITemplate";

export class ExpressionTemplate implements ITemplate {
  private readonly rawExpression: string;
  private readonly reservedKeys: Array<string>;
  private getValue1: (...data: any) => string;

  constructor(rawExpression: string, reservedKeys: Array<string>) {
    this.rawExpression = rawExpression;
    this.reservedKeys = reservedKeys;
  }

  getValueAsync(data: any): Promise<string> {
    if (!this.getValue1) {
      try {
        this.getValue1 = new Function(
          ...Object.keys(data),
          `${
            this.reservedKeys
              ?.map((key) => `const ${key}='@${key}';`)
              .join("") ?? ""
          }return ${this.rawExpression};`
        ) as any;
      } catch (ex) {
        console.error(
          `Error in create binding expression for '${this.rawExpression}'`,
          ex
        );
        throw ex;
      }
    }
    return Promise.resolve(this.getValue1(...Object.values(data)));
  }
}
