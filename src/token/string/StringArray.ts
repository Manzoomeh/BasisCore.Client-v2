import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";

export default class StringArray extends ArrayToken<string> {
  tryParse(value: string): string {
    return value;
  }
  constructor(...collection: Array<IToken<string>>) {
    super(...collection);
  }
}
