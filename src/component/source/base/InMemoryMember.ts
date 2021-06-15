import IContext from "../../../context/IContext";
import { MergeType } from "../../../enum";
import { SourceId } from "../../../type-alias";
import Member from "./Member";

export default abstract class InMemoryMember extends Member {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }
  async AddDataSourceExAsync(sourceId: SourceId): Promise<void> {
    var data = await this.ParseDataAsync(this.context);
    if (data) {
      super.addDataSourceAsync(data, sourceId, MergeType.replace);
    }
  }

  abstract ParseDataAsync(context: IContext): Promise<Array<any>>;
}
