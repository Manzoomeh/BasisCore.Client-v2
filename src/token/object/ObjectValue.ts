import IContext from "../../context/IContext";
import ValueToken from "../base/ValueToken";

export default class ObjectValue extends ValueToken<any> {
  constructor(data: any, context: IContext) {
    super(data, context);
  }
}
