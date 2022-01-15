import SourceUtil from "./SourceUtil";
import InMemoryMember from "./base/InMemoryMember";
import MemberBaseSourceComponent from "./MemberBaseSourceComponent";
import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";

@injectable()
export default class InlineSourceComponent extends MemberBaseSourceComponent<InMemoryMember> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  public convertToMemberObject(element: Element): InMemoryMember {
    return SourceUtil.ConvertToMember(element, this.context);
  }

  protected async runAsync(): Promise<void> {
    if ((this.members?.length ?? 0) > 0) {
      var tasks = this.members.map((x) =>
        this.convertToMemberObject(x).AddDataSourceExAsync(this.id)
      );
      await Promise.all(tasks);
    }
  }
}
