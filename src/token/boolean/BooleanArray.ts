import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";

export default class BooleanArray extends ArrayToken<boolean> {
  tryParse(value: string): boolean {
    return (value ?? "false").toLowerCase() == "true";
  }
  constructor(...collection: Array<IToken<string>>) {
    super(...collection);
  }
}
