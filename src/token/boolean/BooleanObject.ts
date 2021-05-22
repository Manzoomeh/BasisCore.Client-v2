import IContext from "../../context/IContext";
import ObjectToken from "../base/ObjectToken";

export default class BooleanObject extends ObjectToken<boolean> {
  constructor(rawValue: string, context: IContext) {
    super(rawValue, context);
  }

  public static tryParse(value: string) {
    return value == null ? null : value.toLowerCase() === "true";
  }
  tryParse(value: string): boolean {
    return BooleanObject.tryParse(value);
    //return  (value ?? "false").toLowerCase() == "true";
  }
}
