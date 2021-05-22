import IContext from "../../context/IContext";
import ObjectToken from "../base/ObjectToken";

export default class IntegerObject extends ObjectToken<number> {
  constructor(rawValue: string, context: IContext) {
    super(rawValue, context);
  }
  tryParse(value: string): number {
    try {
      return parseInt(value);
    } catch {
      /*Nothing*/
    }
    return 0;
  }
}
