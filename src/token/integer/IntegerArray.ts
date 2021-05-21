import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";

export default class IntegerArray extends ArrayToken<number> {
  tryParse(value: string): number {
    try {
      return parseInt(value);
    } catch {
      /*Nothing*/
    }
    return 0;
  }
  constructor(...collection: Array<IToken<string>>) {
    super(...collection);
  }
}
