import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import BooleanObject from "./BooleanObject";
import IContext from "../../context/IContext";

export default class BooleanArray extends ArrayToken<boolean> {
  constructor(context: IContext, ...collection: Array<IToken<string>>) {
    super(context, ...collection);
  }

  tryParse(value: string): boolean {
    return BooleanObject.tryParse(value);
  }
}
