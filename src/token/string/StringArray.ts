import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import IContext from "../../context/IContext";

export default class StringArray extends ArrayToken<string> {
  constructor(context: IContext, ...collection: Array<IToken<string>>) {
    super(context, ...collection);
  }

  tryParse(value: string): string {
    return value;
  }
}
