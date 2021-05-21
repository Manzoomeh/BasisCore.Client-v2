import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import BooleanObject from "./BooleanObject";

export default class BooleanArray extends ArrayToken<boolean> {
  tryParse(value: string): boolean {
    return BooleanObject.tryParse(value);
    //return (value ?? "false").toLowerCase() == "true";
  }
  constructor(...collection: Array<IToken<string>>) {
    super(...collection);
  }
}
