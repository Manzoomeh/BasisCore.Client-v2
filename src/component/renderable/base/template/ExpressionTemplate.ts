import ITemplate from "./ITemplate";

export class ExpressionTemplate implements ITemplate<any> {
  private readonly rawExpression: string;
  private readonly originalExpression: string;
  private readonly reservedKeys: Array<string>;
  private getValue: (...data: any) => string;

  constructor(
    rawExpression: string,
    originalExpression: string,
    reservedKeys: Array<string>
  ) {
    this.rawExpression = rawExpression;
    this.originalExpression = originalExpression;
    this.reservedKeys = reservedKeys;
  }

  getValueAsync(data: any): Promise<any> {
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
            try{
              return ${this.rawExpression};
            }catch(e){
              if( e instanceof ReferenceError){
                return "";
              }else{
                throw e;
              }
            }`
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
