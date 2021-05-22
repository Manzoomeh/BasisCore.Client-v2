import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import IContext from "../../context/IContext";

export default class IntegerArray extends ArrayToken<number> {
  tryParse(value: string): number {
    try {
      return parseInt(value);
    } catch {
      /*Nothing*/
    }
    return 0;
  }
  constructor(context: IContext, ...collection: Array<IToken<string>>) {
    super(context, ...collection);
  }
}
