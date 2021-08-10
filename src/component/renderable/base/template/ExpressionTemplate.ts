import ITemplate from "./ITemplate";

export class ExpressionTemplate implements ITemplate {
  private readonly rawExpression: string;
  private readonly reservedKeys: Array<string>;
  private getValue: (...data: any) => string;

  constructor(rawExpression: string, reservedKeys: Array<string>) {
    this.rawExpression = rawExpression;
    this.reservedKeys = reservedKeys;
  }

  getValueAsync(data: any): Promise<string> {
    if (!this.getValue) {
      try {
        this.getValue = new Function(
          "$functionArgumentData",
          `${
            this.reservedKeys
              ?.map((key) => `const ${key} = '@${key}'`)
              .join(";") ?? ""
          }
          ${Object.getOwnPropertyNames(data)
            .map((key) => `const ${key} = $functionArgumentData["${key}"]`)
            .join(";")}
            return ${this.rawExpression};`
        ) as any;
      } catch (ex) {
        console.error(
          `Error in create binding expression for '${this.rawExpression}'`,
          ex
        );
        throw ex;
      }
    }
    return Promise.resolve(this.getValue(data));
  }
}
