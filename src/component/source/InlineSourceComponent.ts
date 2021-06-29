import SourceUtil from "./SourceUtil";
import InMemoryMember from "./base/InMemoryMember";
import MemberBaseSourceComponent from "./MemberBaseSourceComponent";

export default class InlineSourceComponent extends MemberBaseSourceComponent<InMemoryMember> {
  public convertToMemberObject(element: Element): InMemoryMember {
    return SourceUtil.ConvertToMember(element, this.context);
  }

  async ExecuteCommandAsync(): Promise<void> {
    if ((this.members?.length ?? 0) > 0) {
      var tasks = this.members.map((x) =>
        this.convertToMemberObject(x).AddDataSourceExAsync(this.id)
      );
      await Promise.all(tasks);
    }
  }
}
