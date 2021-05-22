import IContext from "../../context/IContext";
import ObjectToken from "../base/ObjectToken";

export default class StringObject extends ObjectToken<string> {
  constructor(rawValue: string, context: IContext) {
    super(rawValue, context);
  }
  tryParse(value: string): string {
    return value;
  }
}
