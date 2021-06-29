import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DbSourceMember from "./base/DbSourceMember";
import MemberBaseSourceComponent from "./MemberBaseSourceComponent";

@injectable()
export default class DbSourceComponent extends MemberBaseSourceComponent<DbSourceMember> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  convertToMemberObject(element: Element): DbSourceMember {
    return new DbSourceMember(element, this.context);
  }
}
