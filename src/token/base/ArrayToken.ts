import IContext from "../../context/IContext";
import IToken from "../IToken";

export default abstract class ArrayToken<TType>
  extends Array<IToken<string>>
  implements IToken<TType>
{
  readonly context: IContext;

  constructor(context: IContext, ...data: Array<IToken<string>>) {
    super(...data);
    this.context = context;
  }

  getDefault(): TType {
    const value = this.reduce((r, x) => (r += x.getDefault() ?? ""), "");
    return this.tryParse(value);
  }

  getSourceNames(): string[] {
    return this.reduce(
      (r, x) => r.concat(x.getSourceNames()),
      new Array<string>()
    );
  }

  async getValueAsync(wait: boolean = true): Promise<TType> {
    var tasks = new Array<Promise<string>>();
    this.forEach((token) => tasks.push(token.getValueAsync(wait)));
    var result = await Promise.all(tasks);
    var retVal = this.tryParse(result.join(""));
    return retVal;
  }

  abstract tryParse(value: string): TType;
}
