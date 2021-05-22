import IContext from "../../context/IContext";
import ValueToken from "../base/ValueToken";

export default class IntegerValue extends ValueToken<number> {
  constructor(data: number, context: IContext) {
    super(data, context);
  }
}
