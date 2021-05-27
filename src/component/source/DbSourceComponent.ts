import IContext from "../../context/IContext";
import DbSourceMember from "./base/DbSourceMember";
import SourceComponent from "./SourceComponent";

export default class DbSourceComponent extends SourceComponent<DbSourceMember> {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  convertToMemberObject(element: Element): DbSourceMember {
    return new DbSourceMember(element, this.context);
  }
}
