import IContext from "../../context/IContext";
import ValueToken from "../base/ValueToken";

export default class StringValue extends ValueToken<string> {
  constructor(data: string, context: IContext) {
    super(data, context);
  }
}
