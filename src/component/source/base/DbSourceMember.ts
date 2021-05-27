import IContext from "../../../context/IContext";
import Member from "./Member";

export default class DbSourceMember extends Member {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }
}
