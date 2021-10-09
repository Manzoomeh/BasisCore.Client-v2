import IToken from "../IToken";
import ArrayToken from "../base/ArrayToken";
import IContext from "../../context/IContext";

export default class ObjectArray extends ArrayToken<any> {
  constructor(context: IContext, ...collection: Array<IToken<string>>) {
    super(context, ...collection);
  }

  tryParse(value: string): any {
    return eval(value);
  }
}
