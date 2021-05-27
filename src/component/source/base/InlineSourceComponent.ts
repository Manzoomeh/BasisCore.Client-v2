import IContext from "../../../context/IContext";
import SourceComponent from "../SourceComponent";
import SourceUtil from "../SourceUtil";
import InMemoryMember from "./InMemoryMember";

export default class InlineSourceComponent extends SourceComponent<InMemoryMember> {
  public convertToMemberObject(element: Element): InMemoryMember {
    return SourceUtil.ConvertToMember(element, this.context);
  }
  constructor(element: Element, context: IContext) {
    super(element, context);
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
