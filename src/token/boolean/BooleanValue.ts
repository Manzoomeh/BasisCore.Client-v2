import IContext from "../../context/IContext";
import ValueToken from "../base/ValueToken";

export default class BooleanValue extends ValueToken<boolean> {
  constructor(data: boolean, context: IContext) {
    super(data, context);
  }
}
