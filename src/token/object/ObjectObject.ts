import IContext from "../../context/IContext";
import ObjectToken from "../base/ObjectToken";

export default class ObjectObject extends ObjectToken<any> {
  constructor(rawValue: string, context: IContext) {
    super(rawValue, context);
  }

  tryParse(value: string): any {
    return eval(value);
  }
}
