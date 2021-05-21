import IContext from "../../context/IContext";
import IToken from "../IToken";

export default abstract class ArrayToken<T>
  extends Array<IToken<string>>
  implements IToken<T>
{
  constructor(...data: Array<IToken<string>>) {
    super(...data);
  }
  getDefault(): T {
    const value = this.reduce((r, x) => (r += x.getDefault() ?? ""), "");
    return this.tryParse(value);
  }
  getSourceNames(): string[] {
    return this.reduce(
      (r, x) => r.concat(x.getSourceNames()),
      new Array<string>()
    );
  }
  async getValueAsync(context: IContext, wait: boolean = true): Promise<T> {
    var tasks = new Array<Promise<string>>();
    this.forEach((token) => tasks.push(token.getValueAsync(context, wait)));
    var result = await Promise.all(tasks);
    var retVal = this.tryParse(result.join(""));
    return retVal;
  }
  abstract tryParse(value: string): T;
}
