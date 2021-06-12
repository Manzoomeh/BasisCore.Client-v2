import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import IContext from "../../context/IContext";

export default class IntegerArray extends ArrayToken<number> {
  constructor(context: IContext, ...collection: Array<IToken<string>>) {
    super(context, ...collection);
  }

  tryParse(value: string): number {
    let retVal = 0;
    try {
      retVal = parseInt(value);
    } catch {
      /*Nothing*/
    }
    return retVal;
  }
}
